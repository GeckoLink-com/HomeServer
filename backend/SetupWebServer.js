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
const cookieParser = require('cookie-parser');
const nedbStore = require('connect-nedb-session')(expressSession);
const moment = require('moment');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const fs = require('fs');
const zlib = require('zlib');
const RED = require('node-red');
const process = require('process');
const execSync = require('child_process').execSync;
const crypto = require('crypto');

class SetupWebServer {

  constructor(common, initalCallback) {
    this.common = common;
    this.setupWebClientConnections = [];
    this.requestAuth = false;
    
    this.common.on('changeStatus', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('irReceive', (caller, msg) => {
      this.SendMessage('events', msg);
    });

    this.common.on('motor', (caller, msg) => {
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
          fs.writeFileSync(this.common.config.basePath + '/autoupdate', 'on');
        } else {
          fs.unlinkSync(this.common.config.basePath + '/autoupdate');
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

    const app = express();
    app.use(cookieParser());

    const session = expressSession({
      secret: this.common.config.sessionSecret,
      resave: false,
      saveUninitialized: false,
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
      console.log('js/* ', req.originalUrl);
      const user = req.session.user || {};
      user.pv = (user.pv || 0) + 1;
      user.expire = user.expire || (moment().add(14, 'days').unix());
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
        if(err) return res.end();
        res.set('Content-Type', 'application/javascript');
        res.set('Content-Encoding', 'gzip');
        res.send(data);
      });
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
    this.server = http.Server(app);

    // node-red
    this.redSettings = {
      httpAdminRoot: '/red/',
      httpNodeRoot: '/node/',
      flowFile: 'flow.json',
      userDir: this.common.config.basePath + '/red',
      nodesDir: __dirname + '/../redNodes',
      logging: {
        console: {
          level: 'warning',
          metrics: false,
          audit: false
        }
      },
      debugMaxLength: 1000,
      paletteCategories: ['subflows', 'GeckoLink', 'input', 'output', 'function', 'social', 'storage', 'analysis', 'advanced'],
      editorTheme: {
        page: {
          css: __dirname + '/../frontend/red/theme/css/nodeRed.css',
        },
        deployButton: {
            type: 'simple',
        },
        menu: {
          'menu-item-import-library': false,
          'menu-item-export-library': false,
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
      functionGlobalContext: {
        homeServer: this.common,
      },
    };

    RED.init(this.server, this.redSettings);
    app.use(this.redSettings.httpAdminRoot, RED.httpAdmin);
    app.use(this.redSettings.httpNodeRoot, (req, res) => { RED.httpNode(req, res); });
    RED.start();

    app.get('/*', function(req, res, _next) {

      if(req.path.indexOf('/node/') === 0) {
        return res.sendStatus(404);
      }
      res.redirect('/');
    });

    app.use('/:page', this.IndexResponse);
    app.use('/', this.IndexResponse);

    this.server.listen(this.common.config.setupWebServerPort, '::0', () => {
      console.log('setupWebServer listing on port %d', this.common.config.setupWebServerPort);
      if(this.common.user) {
        if(!this.common.group) this.common.group = this.common.user;
        process.initgroups(this.common.user, this.common.group);
        process.setgid(this.common.group);
        process.setuid(this.common.user);
      }
      initalCallback();
    });

    // socketio
    this.socketio = socketIO(this.server);
    if(this.common.config.setupWebServerProtocol) this.socketio.set('transports', this.common.config.setupWebServerProtocol);
    this.socketio.use((socket, next) => {
      session(socket.request, socket.request.res, next);
    });

    this.socketio.on('connection', (socket) => { this.Connection(socket); });
  }

  Connection(socket) {

    const clientAddress = socket.handshake.address;
    console.log(`new webBrowser client ${clientAddress}`);
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

        if(!('alias' in d3)) {
          console.log('config format error (alias)');
          return;
        }
        if(!('remocon' in d3)) {
          console.log('config format error (remocon)');
          return;
        }
        if(!('uiTable' in d3)) {
          console.log('config format error (uiTable)');
          return;
        }
        if(!('status' in d3)) {
          console.log('config format error (status)');
          return;
        }
        if(!('nodeRedConfig' in d3)) {
          console.log('config format error (nodeRedConfig)');
          return;
        }
        if(!('nodeRedFlow' in d3)) {
          console.log('config format error (nodeRedFlow)');
          return;
        }
        
        this.common.alias = d3.alias;
        this.common.emit('changeAlias', this);

        this.common.remocon = d3.remocon;
        this.common.emit('changeRemocon', this);
        
        this.common.uiTable = d3.uiTable;
        this.common.emit('changeUITable', this);

        this.common.internalStatus = d3.status;
        this.common.emit('changeInternalStatus', this);
                
        RED.stop();
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
        this.common.systemConfig.led = this.common.config.led;
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

    this.common.emit('sendControllerCommand', this, {
      deviceName: 'server',
      command: `sysled ${ this.common.systemConfig.powerLED ? 'on' : 'off' }`,
    });

    this.common.emit('setupWebConnect', this);
  }

  IndexResponse(req, res) {
    console.log('IndexRes ', req.originalUrl);
    fs.readFile(__dirname + '/../frontend/index.html.gz', (err, data) => {
      if(err) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write('xCannot GET /' + req.params.page);
        return res.end();
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

  SendMessage(cmd, data) {
    this.setupWebClientConnections.forEach((con, _i) => {
      con.emit(cmd, data);
    });
  }
}

module.exports = SetupWebServer;
