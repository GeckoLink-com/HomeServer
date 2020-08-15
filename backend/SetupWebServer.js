//
// SetupWebServer.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const http = require('http');
const express = require('express');
const expressSession = require('express-session');
const sharedSession = require('express-socket.io-session');
const cookieParser = require('cookie-parser');
const { v4: uuid } = require('uuid');
const nedbStore = require('connect-nedb-session')(expressSession);
const moment = require('moment');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const fs = require('fs');
const zlib = require('zlib');
const RED = require('node-red');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
const crypto = require('crypto');

class SetupWebServer {

  constructor(common) {
    this.common = common;
    this.setupWebClientConnections = [];
    this.requestAuth = false;
    this.uuid = null;
    
    this.common.on('changeStatus', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('irReceive', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('motor', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('reboot', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('response', (caller, msg) => {
      this.SendMessage('response', msg);
    });

    this.common.on('message', (caller, msg) => {
      this.SendMessage('response', msg);
    });

    this.common.on('deviceInfo', (caller, msg) => {
      this.SendMessage('deviceInfo', msg);
    });

    this.common.on('queueInfo', (caller, msg) => {
      this.SendMessage('queueInfo', msg);
    });

    this.common.on('changeControllerLog', (caller, msg) => {
      this.SendMessage('controllerLog', msg);
    });

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.common.on('changeHueBridges', (_caller) => {
      this.SendMessage('hueBridges', this.common.hueBridges);
    });

    this.common.on('changeSmartMeter', (_caller) => {
      this.SendMessage('smartMeter', this.common.smartMeter);
    });

    this.common.on('statusNotify', (_caller) => {
      this.SendMessage('status', this.common.status);
    });

    this.common.on('changeSystemConfig', (_caller) => {
      try {
        if(this.common.systemConfig.autoUpdate) {
          fs.writeFileSync('etc/apt/apt.conf.d/20auto-upgrades', 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\nAPT::Periodic::AutocleanInterval "1";\n');
        } else {
          fs.writeFileSync('etc/apt/apt.conf.d/20auto-upgrades', 'APT::Periodic::Update-Package-Lists "0";\nAPT::Periodic::Unattended-Upgrade "0";\nAPT::Periodic::AutocleanInterval "0";\n');
        }
      } catch(e) {/* empty */}

      try {
        const str1 = `
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=JP
`;
        const str2 = `
network={
  ssid="${this.common.systemConfig.ssid}"
  psk=${this.common.systemConfig.psk}
}
`;

        const str = (this.common.systemConfig.wifiEnable && this.common.systemConfig.wifi)?(str1 + str2):str1;

        const oldStr = fs.readFileSync('/etc/wpa_supplicant/wpa_supplicant.conf', 'utf-8').replace(/[\r \t]/g,'');
        const oldSsid = (oldStr.match(/ssid="(.+)"/)||[null,null])[1];
        const oldPsk = (oldStr.match(/psk=([^"\n]+)/)||[null,null])[1];
        let writeFlag = false;
        if(this.common.systemConfig.wifiEnable && this.common.systemConfig.wifi) {
          if(this.common.systemConfig.ssid != oldSsid) writeFlag = true;
          if(this.common.systemConfig.psk != oldPsk) writeFlag = true;
        } else {
          if(oldSsid || oldPsk) writeFlag = true;
        }
        if(writeFlag) {
          console.log('set wpa_supplicant ', this.common.systemConfig.wifiEnable && this.common.systemConfig.wifi);
          fs.writeFileSync('/etc/wpa_supplicant/wpa_supplicant.conf', str);
          exec('/usr/local/bin/wificontrol --link');
        }
      } catch(e) {/* empty */}

      this.common.emit('sendControllerCommand', this, {
        deviceName: 'server',
        command: `sysled ${ this.common.systemConfig.powerLED ? 'on' : 'off' }`,
      });

      if(_caller !== this) {
        this.SendMessage('systemConfig', this.common.systemConfig);
      }
    });

    this.common.on('requestAuth', (_caller) => {
      this.requestAuth = true;
      this.requestAuthTimer = setTimeout(() => {
        this.requestAuth = false;
        this.SendMessage('requestAuth', false);
        this.requestAuthTimer = null;
      }, 5 * 60 * 1000);
      this.SendMessage('requestAuth', true);
    });

    this.common.on('readSystemConfigDone', (_caller) => {
      const app = express();
      app.use(cookieParser());

      const session = expressSession({
        secret: this.common.systemConfig.sessionSecret,
        resave: false,
        saveUninitialized: true,
        rolling: true,
        cookie: {
          maxAge: 31 * 24 * 60 * 60 * 1000,
          secure: false,
          httpOnly: false,
        },
        store: new nedbStore({
          filename: this.common.config.basePath + '/session.db',
        }),
      });
      app.use(session);
      app.enable('trust proxy');

      app.use('/js/*', (req, res) => {
        const user = req.session.user || {};
        user.pv = (user.pv || 0) + 1;
        user.expire = user.expire || (moment().add(14, 'days').unix());
        this.uuid = user.uuid = uuid();
        req.session.user = user;
        req.session.save();
        req.session.touch();

        const hash = crypto.createHash('sha256');
        hash.update(this.common.systemConfig.password + user.nonce);
        const digest = hash.digest('hex');

        if((user.account !== this.common.systemConfig.account) ||
           (user.digest !== digest)) {
          req.originalUrl = '/js/SignIn.js';
        }

        fs.readFile(`${__dirname}/../frontend${req.originalUrl}.gz`, (err, data) => {
          if(err) {
            fs.readFile(`${__dirname}/../frontend${req.originalUrl}`, (err, data) => {
              if(err) return res.end();
              res.set('Content-Type', 'application/javascript');
              res.send(data);
            });
            return;
          }
          res.set('Content-Type', 'application/javascript');
          res.set('Content-Encoding', 'gzip');
          res.send(data);
        });
      });

      app.use('*', (req, res, next) => {
        const user = req.session.user || {};
        const hash = crypto.createHash('sha256');
        hash.update(this.common.systemConfig.password + user.nonce);
        const digest = hash.digest('hex');
        if(req.originalUrl === '/index.html') return next();
        if(req.originalUrl.indexOf('/google-smarthome/') === 0) return next();
        if((user.account !== this.common.systemConfig.account) ||
           (user.digest !== digest)) {
          return res.redirect('/index.html');
        }
        next();
      });

      app.use(express.static(__dirname + '/../frontend/'));
      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(bodyParser.json());

      app.get('/config/:filename', (req, res) => {
        let nodeRedConfig = null;
        try {
          nodeRedConfig = JSON.parse(fs.readFileSync(this.common.config.basePath + '/red/.config.json'));
        } catch(e) {/* empty */}

        let nodeRedFlow = null;
        try {
          nodeRedFlow = JSON.parse(fs.readFileSync(this.common.config.basePath + '/red/flow.json'));
        } catch(e) {/* empty */}

        const buf = JSON.stringify({alias: this.common.alias, remocon: this.common.remocon, uiTable:this.common.uiTable, status:this.common.internalStatus, nodeRedConfig:nodeRedConfig, nodeRedFlow:nodeRedFlow}, null, 2);
        zlib.gzip(buf, (err, data) => {
          res.send(data);
        });
      });

      app.get('/auth/:filename', (req, res) => {
        const buf = JSON.stringify({system:this.common.systemConfig}, null, 2);
        zlib.gzip(buf, (err, data) => {
          res.send(data);
        });
      });

      app.get('/remocon/:filename', (req, res) => {
        const buf = JSON.stringify({remocon:this.common.remocon}, null, 2);
        zlib.gzip(buf, (err, data) => {
          res.send(data);
        });
      });

      app.get('/google-smarthome/devices', (req, res) => {
        this.common.emit('googleSmarthomeLocalDevices', msg => res.json(msg));
      });

      app.post('/google-smarthome/execute', (req, res) => {
        this.common.emit('googleSmarthomeLocalExecute', req.body, msg => res.json(msg));
      });
      this.server = http.Server(app);

      // node-red
      this.redSettings = {
        httpAdminRoot: '/red/',
        httpNodeRoot: '/node/',
        flowFile: 'flow.json',
        credentialSecret: this.common.systemConfig.nodeRedCredential,
        userDir: this.common.config.basePath + '/red',
        nodesDir: __dirname + '/../redNodes',
        logging: {
          console: {
            level: 'off',
          },
          myCustomLogger: {
            level: 'info',
            metrics: false,
            handler() {
              return (data) => {
                console.log(data.msg);
              };
            },
          },
        },
        debugMaxLength: 1000,
        paletteCategories: ['subflows', 'GeckoLink', 'function', 'common', 'input', 'output', 'sequence', 'network', 'storage', 'parser', 'dashboard'],
        editorTheme: {
          page: {
            css: __dirname + '/../frontend/red/theme/css/nodeRed.css',
          },
          deployButton: {
              type: 'simple',
          },
          menu: {
            'menu-item-import-library': true,
            'menu-item-export-library': true,
            'menu-item-keyboard-shortcuts': false,
            'menu-item-help': false,
            'menu-item-show-tips': true,
          },
          userMenu: false,
        },
        adminAuth: {
          type: 'credentials',
          users: [],
          default: {
            permissions: '*',
          },
        },
        prjects: {
          enabled: false,
        },
        functionGlobalContext: {
          homeServer: this.common,
        },
      };
      Object.defineProperties(this.redSettings.functionGlobalContext, {
        get: { configurable: true },
        set: { configurable: true },
        keys: { configurable: true },
      });

      RED.init(this.server, this.redSettings);
      app.use(this.redSettings.httpAdminRoot, RED.httpAdmin);
      app.use(this.redSettings.httpNodeRoot, RED.httpNode);
      RED.start();

      app.get('/*', (req, res) => {
        console.log('=======================================');
        console.log('app * ', req.path);
        console.log('method ', req.method);
        console.log('params ', req.params);
        console.log('body ', req.body);
        console.log('query ', req.query);
        console.log('=======================================');
        if(req.path.indexOf('/node/') === 0) return res.sendStatus(404);
        res.redirect('/');
      });

      app.use('/:page', this.IndexResponse);
      app.use('/', this.IndexResponse);

      this.server.listen(this.common.config.setupWebServerPort, '::0', () => {
        console.log('setupWebServer listing on port %d', this.common.config.setupWebServerPort);
        this.common.emit('webServerStart', this);
        this.common.emit('sendControllerCommand', this, {
          deviceName: 'server',
          command: `sysled ${ this.common.systemConfig.powerLED ? 'on' : 'off' }`,
        });
      });

      // socketio
      this.socketio = socketIO(this.server);
      if(this.common.config.setupWebServerProtocol) this.socketio.set('transports', this.common.config.setupWebServerProtocol);
      this.socketio.use((socket, next) => {
        session(socket.request, socket.request.res, next);
      });
      this.socketio.use(sharedSession(session, { autoSave: true }));
      this.socketio.on('connection', this.Connection.bind(this));
    });

    if(this.AttachTableID()) this.common.emit('changeUITable', this);
  }

  Connection(socket) {

    const clientAddress = socket.handshake.address;
    console.log(`new webBrowser client ${clientAddress}`);
    const user = socket.handshake.session.user || {};
    if(!this.uuid || (this.uuid !== user.uuid)) {
      socket.emit('reload');
      return;
    }
    this.setupWebClientConnections.push(socket);

  // receive jobs
    socket.on('requestNonce', (callback) => {
      this.nonce = crypto.randomBytes(32).toString('hex');
      callback(this.nonce);
    });
      
    socket.on('login', (data, callback) => {
      const session = socket.request.session;
      const hash = crypto.createHash('sha256');
      hash.update(this.common.systemConfig.password + this.nonce);
      const digest = hash.digest('hex');
      if((data.account !== this.common.systemConfig.account) ||
         (data.digest !== digest)) {
        return callback(false);
      }
      const user = session.user || {};
      user.pv = (user.pv || 0) + 1;
      user.expire = user.expire || (moment().add(14, 'days').unix());
      user.account = data.account;
      user.digest = data.digest;
      user.nonce = this.nonce;
      session.user = user;
      session.save();
      session.touch();
      callback(true);
    });

    socket.on('command', (data) => {
      this.common.emit('sendControllerCommand', this, data);
    });

    socket.on('alias', (data) => {
      this.common.alias = data;
      this.common.emit('changeAlias', this);
    });

    socket.on('remocon', (data) => {
      this.common.remocon = data;
      this.common.emit('changeRemocon', this);
    });

    socket.on('uiTable', (data) => {
      this.common.uiTable = data;
      this.AttachTableID();
      this.common.emit('changeUITable', this);
    });
    
    socket.on('systemConfig', (data) => {
      this.common.systemConfig = data;
      if(this.common.systemConfig.requestRemoteAccessState === 1) {
        if(this.common.systemConfig.account.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          this.common.emit('sendControllerCommand', this, {
            deviceName: 'server',
            command: 'config ' + this.common.systemConfig.account + ' n 0',
          });
          this.common.systemConfig.requestRemoteAccessState = 2;
          return;
        }
        this.common.systemConfig.requestRemoteAccessState = 0;
      }
      this.common.emit('changeSystemConfig', this);
    });
    
    socket.on('setConfig', (data) => {
      zlib.gunzip(data, (err, d2) => {
        let d3 = null;
        try {
          d3 = JSON.parse(d2.toString());
        } catch(e) {
          console.log('config parse error');
          console.log(e);
          return;
        }

        if(!d3.alias) {
          console.log('config format error (alias)');
          return;
        }
        if(!d3.remocon) {
          console.log('config format error (remocon)');
          return;
        }
        if(!d3.uiTable) {
          console.log('config format error (uiTable)');
          return;
        }
        if(!d3.status) {
          console.log('config format error (status)');
          return;
        }
        if(!d3.nodeRedConfig) {
          console.log('config format error (nodeRedConfig)');
          return;
        }
        if(!d3.nodeRedFlow) {
          console.log('config format error (nodeRedFlow)');
          return;
        }
        
        this.common.alias = d3.alias;
        this.common.emit('changeAlias', this);

        this.common.remocon = d3.remocon;
        this.common.uiTable = d3.uiTable;
        this.AttachTableID();
        this.common.emit('changeRemocon', this);
        this.common.emit('changeUITable', this);

        this.common.internalStatus = d3.status;
        this.common.CheckInternalStatus();
        this.common.emit('changeInternalStatus', this);
        for(const deviceName in this.common.internalStatus) {
          if(deviceName === 'formatVersion') continue;
          for(const func in this.common.internalStatus[deviceName]) {
            const device = (this.common.aliasTable[deviceName] && this.common.aliasTable[deviceName].device) ? this.common.aliasTable[deviceName].device : deviceName;
            const funcName = (this.common.aliasTable[`${deviceName}:${func}`] && this.common.aliasTable[`${deviceName}:${func}`].property && (this.common.aliasTable[`${deviceName}:${func}`].property.name !== '')) ? this.common.aliasTable[`${deviceName}:${func}`].property.name : func;
            this.common.status[`${deviceName}:${func}`] = Object.assign(this.common.status[`${deviceName}:${func}`] || {
              deviceName: deviceName,
              device: device,
              func: func,
              funcName: funcName,
            }, this.common.internalStatus[deviceName][func]);
          }
        }

        for(const func of this.server.listeners('upgrade')) {
          if(func.name === 'upgrade') this.server.off('upgrade', func);
        }
        RED.stop().then(() => {
          console.log('RED stopped');
          if(d3.nodeRedConfig) {
            fs.writeFileSync(this.common.config.basePath + '/red/.config.json_new', JSON.stringify(d3.nodeRedConfig, null, 2));
            fs.renameSync(this.common.config.basePath + '/red/.config.json_new', this.common.config.basePath + '/red/.config.json');
          }

          if(d3.nodeRedFlow) {
            fs.writeFileSync(this.common.config.basePath + '/red/flow.json_new', JSON.stringify(d3.nodeRedFlow, null, 2));
            fs.renameSync(this.common.config.basePath + '/red/flow.json_new', this.common.config.basePath + '/red/flow.json');
          }
          RED.init(this.server, this.redSettings);
          RED.start();
          this.common.emit('changeSystemConfig', this);
        });
      });
    });

    socket.on('setAuth', (data) => {
      zlib.gunzip(data, (err, d2) => {
        let d3 = null;
        try {
          d3 = JSON.parse(d2.toString());
        } catch(e) {
          console.log('config parse error');
          console.log(e);
          return;
        }

        if(!('system' in d3)) {
          console.log('config format error (system)');
          return;
        }
        
        this.common.systemConfig = d3.system;
        this.common.systemConfig.version = this.common.version;
        this.common.systemConfig.hap = this.common.config.hap;
        this.common.systemConfig.pwm = this.common.config.pwm;
        this.common.systemConfig.dmx = this.common.config.dmx;
        this.common.systemConfig.led = this.common.config.led;
        if(!this.common.systemConfig.powerLED) this.common.systemConfig.powerLED = this.common.config.powerLED;
        this.common.systemConfig.motor = this.common.config.motor;
        this.common.systemConfig.smartMeter = this.common.config.smartMeter;
        this.common.systemConfig.initialPassword = this.common.initialPassword;
        this.common.systemConfig.defaultPassword = this.common.defaultPassword;
        if(this.common.systemConfig.bridge) this.common.systemConfig.bridge.changeState = true;
        this.common.systemConfig.changeAuthKey = true;
        this.common.systemConfig.requestRemoteAccessState = 0;
        this.common.systemConfig.remote = false;
        let param = '';
        for(let i = 0; i < 24; i++)
          param += ' ' + ('0' + this.common.systemConfig.xbeeKey[i].toString(16)).slice(-2);
        this.common.emit('sendControllerCommand', this, {deviceName:'server', command:'xbeekey' + param});
        this.common.emit('changeSystemConfig', this);
      });
    });

    socket.on('initConfig', () => {
      try {
        fs.unlinkSync(this.common.config.basePath + '/alias.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/internalStatus.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/remocon.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/system.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/uiTable.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/devicetable.reg');
      } catch(e) {/* empty */}
      try {
        execSync('rm -rf ' + this.common.config.basePath + '/red');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this.common.config.basePath + '/xbee.key');
      } catch(e) {/* empty */}
      try {
        execSync('rm -rf ' + this.common.config.basePath + '/log');
      } catch(e) {/* empty */}
      try {
        fs.mkdirSync(this.common.config.basePath + '/log');
      } catch(e) {/* empty */}
      console.log('reboot');
      this.common.emit('sendControllerCommand', this, {
        deviceName: 'server',
        command: 'reboot',
      });
    });

    socket.on('addRemocon', (data) => {
      let code = null;
      try {
        code = JSON.parse(data);
        this.AddRemocon(code);
      } catch(e) {
        zlib.gunzip(data, (err, decodeData) => {
          try {
            code = JSON.parse(decodeData.toString());
            this.AddRemocon(code);
          } catch(e) {
            console.log('config parse error');
            console.log(e);
          }
        });
      }
    });     

    socket.on('disconnect', (reason) => {
      console.log('disconnect webbrowser : ', reason);
      for(const i in this.setupWebClientConnections) {
        if(this.setupWebClientConnections[i].id == socket.id) {
          this.setupWebClientConnections.splice(i, 1);
        }
      }
    });

    socket.on('shutdown', () => {
      console.log('shutdown');
      this.common.emit('sendControllerCommand', this, {
        deviceName: 'server',
        command: 'shutdown',
      });
    });

    socket.on('authConfirm', (msg) => {
      this.common.emit('authConfirm', this, msg);
      this.requestAuth = false;
      if(this.requestAuthTimer) clearTimeout(this.requestAuthTimer);
      this.requestAuthTimer = null;
      this.SendMessage('requestAuth', false);
    });

    socket.on('searchSSID', (callback) => {
      exec('/usr/local/bin/wificontrol --scan', (err, stdout) => {
        if(stdout) {
          callback((stdout.replace(/\\x00/g, '').match(/ESSID\s*:\s*"(.+)(?=")/g)||[]).map(s => s.replace(/^ESSID\s*:\s*"/, '')));
        } else {
          callback([]);
        }
      });
    });
    
    this.SendMessage('deviceInfo', {type:'deviceInfo', data:this.common.deviceInfo});
    this.SendMessage('status', this.common.status);
    this.SendMessage('alias', this.common.alias);
    this.SendMessage('remocon', this.common.remocon);
    this.SendMessage('uiTable', this.common.uiTable);
    this.SendMessage('systemConfig', this.common.systemConfig);
    this.SendMessage('controllerLog', this.common.controllerLog);
    this.SendMessage('hueBridges', this.common.hueBridges);
    this.SendMessage('smartMeter', this.common.smartMeter);
    this.common.shutdownEnable = ((clientAddress != null) &&
                                   (clientAddress !== '::ffff:127.0.0.1') &&
                                   (clientAddress !== '::1'));
    this.SendMessage('shutdownEnable', this.common.shutdownEnable);
    this.SendMessage('requestAuth', this.requestAuth);
    this.common.emit('setupWebConnect', this);
  }

  IndexResponse(req, res) {
    fs.readFile(__dirname + '/../frontend/index.html.gz', (err, data) => {
      if(err) {
        fs.readFile(__dirname + '/../frontend/index.html', (err, data) => {
          if(err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.write('xCannot GET /' + req.params.page);
            return res.end();
          }
          res.set('Content-Type', 'text/html');
          res.send(data);
        });
        return;
      }
      res.set('Content-Type', 'text/html');
      res.set('Content-Encoding', 'gzip');
      res.send(data);
    });
  }

  AddRemocon(code) {
    if(!code.remocon) return;
    if(!this.common.remocon.remoconTable) this.common.remocon.remoconTable = {};
    for(const i in code.remocon.remoconTable) {
      this.common.remocon.remoconTable[i] = code.remocon.remoconTable[i];
    }
    if(!this.common.remocon.remoconGroup) this.common.remocon.remoconGroup = {};
    for(const i in code.remocon.remoconGroup) {
      this.common.remocon.remoconGroup[i] = code.remocon.remoconGroup[i];
    }
    if(!this.common.remocon.remoconMacro) this.common.remocon.remoconMacro = {};
    for(const i in code.remocon.remoconMacro) {
      this.common.remocon.remoconMacro[i] = code.remocon.remoconMacro[i];
    }
    this.common.emit('changeRemocon', this);
    this.SendMessage('remocon', this.common.remocon);
  }

  AttachTableID() {
    if(!this.common.uiTable || !this.common.uiTable.ItemList) return false;

    let f = false;
    for(const item of this.common.uiTable.ItemList) {
      if(!item.id) {
        item.id = uuid();
        f = true;
      }
      if(!item.status) continue;
      for(const status of item.status) {
        if(!status.id) {
          status.id = uuid();
          f = true;
        }
      }
    }
    return f;
  }

  SendMessage(cmd, data) {
    this.setupWebClientConnections.forEach((con, _i) => {
      con.emit(cmd, data);
    });
  }
}

module.exports = SetupWebServer;
