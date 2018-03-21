//
// SetupWebServer.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const fs = require('fs');
const zlib = require('zlib');
const jssha = require('jssha');
const basicAuth = require('basic-auth-connect');
const RED = require('node-red');
const process = require('process');
const execSync = require('child_process').execSync;

class SetupWebServer {

  constructor(common, initalCallback) {
  
    this._common = common;
    this._server = null;

    this._setupWebClientConnections = [];
    
    this._common.on('changeStatus', (caller, msg) => {
      this._SendMessage('events', msg);
    });

    this._common.on('irReceive', (caller, msg) => {
      this._SendMessage('events', msg);
    });

    this._common.on('motor', (caller, msg) => {
      this._SendMessage('events', msg);
    });

    this._common.on('response', (caller, msg) => {
      this._SendMessage('response', msg);
    });

    this._common.on('message', (caller, msg) => {
      this._SendMessage('response', msg);
    });

    this._common.on('deviceInfo', (caller, msg) => {
      this._SendMessage('deviceInfo', msg);
    });

    this._common.on('queueInfo', (caller, msg) => {
      this._SendMessage('queueInfo', msg);
    });

    this._common.on('changeControllerLog', (caller, msg) => {
      this._SendMessage('controllerLog', msg);
    });

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.on('changeHueBridges', (_caller) => {
      this._SendMessage('hueBridges', this._common.hueBridges);
    });

    this._common.on('changeSmartMeter', (_caller) => {
      this._SendMessage('smartMeter', this._common.smartMeter);
    });

    this._common.on('statusNotify', (_caller) => {
      this._SendMessage('status', this._common.status);
    });

    this._common.on('changeSystemConfig', (_caller) => {
      if(this._common.initialState) return;

      const initialFlag = !this._server;
      if(!initialFlag) RED.stop();

      if(initialFlag) {
        this._app = express();
        this._app.use(/^(?!\/node\/)/, basicAuth((user, password) => {
          const sha256 = new jssha('SHA-256', 'TEXT');
          sha256.update(user + password);
          const pw = sha256.getHash('HEX');
          if((user == this._common.systemConfig.account) && (pw == this._common.systemConfig.password)) return true;
          return false;
        }));
        this._app.use('/js/*.js', (req ,res, next) => {
          fs.readFile(`${__dirname}/../frontend${req.originalUrl}.gz`, (err, data) => {
            if(err) return next();
            res.set('Content-Type', 'application/javascript');
            res.set('Content-Encoding', 'gzip');
            res.send(data);
          });
        });
        this._app.use(express.static(__dirname + '/../frontend/'));
        this._app.use(bodyParser.urlencoded({ extended: true }));
        this._app.use(bodyParser.json());
        
        this._app.get('/remote', (req, res) => {
          res.redirect('http://' + req.headers.host + ':' + this._common.config.localApplicationRedirectPort);
        });

        this._app.get('/config/:filename', (req, res) => {
          let nodeRedConfig = null;
          try {
            nodeRedConfig = JSON.parse(fs.readFileSync(this._common.config.basePath + '/red/.config.json'));
          } catch(e) {/* empty */}

          let nodeRedFlow = null;
          try {
            nodeRedFlow = JSON.parse(fs.readFileSync(this._common.config.basePath + '/red/flow.json'));
          } catch(e) {/* empty */}

          const buf = JSON.stringify({alias: this._common.alias, remocon: this._common.remocon, uiTable:this._common.uiTable, status:this._common.internalStatus, nodeRedConfig:nodeRedConfig, nodeRedFlow:nodeRedFlow}, null, 2);
          zlib.gzip(buf, (err, data) => {
            res.send(data);
          });
        });

        this._app.get('/auth/:filename', (req, res) => {
          const buf = JSON.stringify({system:this._common.systemConfig}, null, 2);
          zlib.gzip(buf, (err, data) => {
            res.send(data);
          });
        });

        this._app.get('/remocon/:filename', (req, res) => {
          const buf = JSON.stringify({remocon:this._common.remocon}, null, 2);
          zlib.gzip(buf, (err, data) => {
            res.send(data);
          });
        });
        this._server = http.Server(this._app);
      }

      try {
        if(this._common.systemConfig.autoUpdate == 'on') {
          fs.writeFileSync(this._common.config.basePath + '/autoupdate', 'on');
        } else {
          fs.unlinkSync(this._common.config.basePath + '/autoupdate');
        }
      } catch(e) {/* empty */}

      // node-red
      const redSettings = {
        httpAdminRoot: '/red/',
        httpNodeRoot: '/node/',
        flowFile: 'flow.json',
        userDir: this._common.config.basePath + '/red',
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
          homeServer: this._common,
        },
      };

      RED.init(this._server, redSettings);
      this._app.use(redSettings.httpAdminRoot, RED.httpAdmin);
      this._app.use(redSettings.httpNodeRoot, (req, res) => { RED.httpNode(req, res); });
      RED.start();

      if(initialFlag) {
        this._app.get('/*', function(req, res, _next) {

          if(req.path.indexOf('/node/') === 0) {
            return res.sendStatus(404);
          }
          res.redirect('/');
        });

        this._server.listen(this._common.config.setupWebServerPort, () => {
          console.log('setupWebServer listing on port %d', this._common.config.setupWebServerPort);
          if(this._common.user) {
            if(!this._common.group) this._common.group = this._common.user;
            process.initgroups(this._common.user, this._common.group);
            process.setgid(this._common.group);
            process.setuid(this._common.user);
          }
          initalCallback();
        });

        // socketio
        this._socketio = socketIO(this._server);
        if(this._common.config.setupWebServerProtocol) this._socketio.set('transports', this._common.config.setupWebServerProtocol);
        this._socketio.on('connection', (socket) => { this._Connection(socket); });
      } else {
        if(!this._common.systemConfig.powerLED) this._common.systemConfig.powerLED = 'off';
        this._common.emit('sendControllerCommand', this, {
          deviceName: 'server',
          command: 'sysled ' + this._common.systemConfig.powerLED,
        });
      }
    });
  }

  _Connection(socket) {

    const clientAddress = socket.handshake.address;
    console.log(`new webBrowser client ${clientAddress}`);
    this._setupWebClientConnections.push(socket);
    
  // receive jobs
    socket.on('command', (data) => {
      this._common.emit('sendControllerCommand', this, data);
    });

    socket.on('alias', (data) => {
      this._common.alias = data;
      this._common.emit('changeAlias', this);
    });

    socket.on('remocon', (data) => {
      this._common.remocon = data;
      this._common.emit('changeRemocon', this);
    });

    socket.on('uiTable', (data) => {
      this._common.uiTable = data;
      this._common.emit('changeUITable', this);
    });
    
    socket.on('systemConfig', (data) => {
      this._common.systemConfig = data;
      this._common.emit('changeSystemConfig', this);
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
        
        this._common.alias = d3.alias;
        this._common.emit('changeAlias', this);

        this._common.remocon = d3.remocon;
        this._common.emit('changeRemocon', this);
        
        this._common.uiTable = d3.uiTable;
        this._common.emit('changeUITable', this);

        this._common.internalStatus = d3.status;
        this._common.emit('changeInternalStatus', this);
                
        if(d3.nodeRedConfig) {
          fs.writeFileSync(this._common.config.basePath + '/red/.config.json_new', JSON.stringify(d3.nodeRedConfig, null, 2));
          fs.renameSync(this._common.config.basePath + '/red/.config.json_new', this._common.config.basePath + '/red/.config.json');
        }

        if(d3.nodeRedFlow) {
          fs.writeFileSync(this._common.config.basePath + '/red/flow.json_new', JSON.stringify(d3.nodeRedFlow, null, 2));
          fs.renameSync(this._common.config.basePath + '/red/flow.json_new', this._common.config.basePath + '/red/flow.json');
        }
        this._common.emit('changeSystemConfig', this);
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
        
        this._common.systemConfig = d3.system;
        this._common.systemConfig.version = this._common.version;
        this._common.systemConfig.hap = this._common.config.hap;
        this._common.systemConfig.led = this._common.config.led;
        this._common.systemConfig.motor = this._common.config.motor;
        this._common.systemConfig.smartMeter = this._common.config.smartMeter;
        this._common.systemConfig.initialPassword = this._common.initialPassword;
        this._common.systemConfig.defaultPassword = this._common.defaultPassword;
        let param = '';
        for(let i = 0; i < 24; i++)
          param += ' ' + ('0' + this._common.systemConfig.xbeeKey[i].toString(16)).slice(-2);
        this._common.emit('sendControllerCommand', this, {deviceName:'server', command:'xbeekey' + param});
        this._common.emit('changeSystemConfig', this);
      });
    });

    socket.on('initConfig', () => {
      try {
        fs.unlinkSync(this._common.config.basePath + '/alias.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/internalStatus.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/remocon.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/system.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/uiTable.json');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/devicetable.reg');
      } catch(e) {/* empty */}
      try {
        execSync('rm -rf ' + this._common.config.basePath + '/log');
      } catch(e) {/* empty */}
      try {
        execSync('rm -rf ' + this._common.config.basePath + '/red');
      } catch(e) {/* empty */}
      try {
        fs.unlinkSync(this._common.config.basePath + '/xbee.key');
      } catch(e) {/* empty */}
      try {
        fs.mkdirSync(this._common.config.basePath + '/log');
      } catch(e) {/* empty */}
      this._common.emit('sendControllerCommand', this, {deviceName:'server', command:'reboot'});
      process.exit(0);
    });

    socket.on('addRemocon', (data) => {
      let code = null;
      try {
        code = JSON.parse(data);
        this._AddRemocon(code);
      } catch(e) {
        zlib.gunzip(data, (err, decodeData) => {
          try {
            code = JSON.parse(decodeData.toString());
            this._AddRemocon(code);
          } catch(e) {
            console.log('config parse error');
            console.log(e);
          }
        });
      }
    });     

    socket.on('disconnect', (reason) => {
      console.log('disconnect webbrowser : ', reason);
      for(const i in this._setupWebClientConnections) {
        if(this._setupWebClientConnections[i].id == socket.id) {
          this._setupWebClientConnections.splice(i, 1);
        }
      }
    });

    socket.on('shutdown', () => {
      console.log('shutdown');
      this._common.emit('sendControllerCommand', this, {
        deviceName: 'server',
        command: 'shutdown',
      });
    });
    
    this._SendMessage('deviceInfo', {type:'deviceInfo', data:this._common.deviceInfo});
    this._SendMessage('status', this._common.status);    
    this._SendMessage('alias', this._common.alias);
    this._SendMessage('remocon', this._common.remocon);
    this._SendMessage('uiTable', this._common.uiTable);
    this._SendMessage('systemConfig', this._common.systemConfig);
    this._SendMessage('controllerLog', this._common.controllerLog);
    this._SendMessage('hueBridges', this._common.hueBridges);
    this._SendMessage('smartMeter', this._common.smartMeter);
    this._common.shutdownEnable = ((clientAddress != null) &&
                                   (clientAddress !== '::ffff:127.0.0.1') &&
                                   (clientAddress !== '::1'));
    this._SendMessage('shutdownEnable', this._common.shutdownEnable);

    if(!this._common.systemConfig.powerLED) this._common.systemConfig.powerLED = 'off';
    this._common.emit('sendControllerCommand', this, {
      deviceName: 'server',
      command: 'sysled ' + this._common.systemConfig.powerLED,
    });

    this._common.emit('setupWebConnect', this);
  }

  _AddRemocon(code) {
    if(!code.remocon) return;
    if(!this._common.remocon.remoconTable) this._common.remocon.remoconTable = {};
    for(const i in code.remocon.remoconTable) {
      this._common.remocon.remoconTable[i] = code.remocon.remoconTable[i];
    }
    if(!this._common.remocon.remoconGroup) this._common.remocon.remoconGroup = {};
    for(const i in code.remocon.remoconGroup) {
      this._common.remocon.remoconGroup[i] = code.remocon.remoconGroup[i];
    }
    if(!this._common.remocon.remoconMacro) this._common.remocon.remoconMacro = {};
    for(const i in code.remocon.remoconMacro) {
      this._common.remocon.remoconMacro[i] = code.remocon.remoconMacro[i];
    }
    this._common.emit('changeRemocon', this);
    this._SendMessage('remocon', this._common.remocon);
  }

  _SendMessage(cmd, data) {
    this._setupWebClientConnections.forEach((con, _i) => {
      con.emit(cmd, data);
    });
  }
}

module.exports = SetupWebServer;
