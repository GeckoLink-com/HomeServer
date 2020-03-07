//
// Common.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const eventEmitter = require('events').EventEmitter;
const registry = require('./Registry');
const fs = require('fs');
const moment = require('moment');
const crypto = require('crypto');
const process = require('process');

class Common extends eventEmitter {

  constructor(config) {
    super();
    this.setMaxListeners(100);

    this.config = config;
    this.config.basePath = this.config.basePath.replace(/\/$/, '');

    this.alias = {};
    this.aliasTable = {};
    this.remocon = {};
    this.uiTable = {};
    this.internalStatus = {virtualSW:{}};
    this.deviceInfo = [];
    this.status = [];
    this.systemConfig = {};
    this.controllerLog = [];
    this.hueBridges = [];
    this.Registry = new registry(this.config.basePath);
    this.statusFunc = ['ad0', 'ad1', 'ad2', 'ad3', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'ha0', 'ha1', 'hai0', 'hai1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3', 'rainInfo', 'smartMeter', 'value0', 'value1', 'value2', 'value3'];
    this.analogFunc = ['ad0', 'ad1', 'ad2', 'ad3', 'rainInfo', 'smartMeter'];
    this.commandFunc = ['gpio0', 'gpio1', 'ha0', 'ha1', 'hao0', 'hao1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3', 'switch'];
    this.responsiveCommandFunc = ['ha0', 'ha1', 'sw'];

    this.version = '0.00';
    try {
      const data = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
      if(data.version) this.version = data.version;
    } catch(e) {/* empty */}
    this.systemConfig.version = this.version;
    
    this.serial = '00000001';
    this.initialPassword = this.config.initialPassword || this.config.defaultPassword;
    this.defaultPassword = this.config.defaultPassword || this.config.initialPassword;
    this.updateMode = 'release';
    try {
      const data = JSON.parse(fs.readFileSync('/boot/system.conf', 'utf8'));
      if(data.serial) this.serial = data.serial;
      if(data.initialPassword) this.initialPassword = data.initialPassword;
      if(data.updateMode) this.updateMode = data.updateMode;
    } catch(e) {/* empty */}
    try {
      fs.mkdirSync('/etc/apt/sources.list.d', 0o755);
    } catch(e) {/* empty */}
    try {
      fs.writeFileSync('/etc/apt/sources.list.d/geckolink.list', 'deb https://geckolink.com/archive buster ' + this.updateMode + '\n', {mode: 0o644});
    } catch(e) {/* empty */}

    this.wifiEnable = false;
    if(!this.config.local) {
      try {
        fs.writeFileSync('/sys/class/gpio/export', '3');
      } catch(e) {/* empty */}
      try {
        fs.writeFileSync('/sys/class/gpio/export', '5');
      } catch(e) {/* empty */}
      fs.writeFileSync('/sys/class/gpio/gpio3/direction', 'in');
      fs.writeFileSync('/sys/class/gpio/gpio5/direction', 'in');
      fs.writeFileSync('/sys/class/gpio/gpio3/edge', 'both');
      fs.writeFileSync('/sys/class/gpio/gpio5/edge', 'both');
      const buttonCheck = (err, value) => {
        if(!parseInt(value) && !this.shutdownTimer) {
          console.log('start button count');
          this.emit('sendControllerCommand', this, {
            deviceName: 'server',
            command: 'sysled heartbeat',
          });
          this.shutdownTimer = setTimeout(() => {
            console.log('shutdown');
            this.shutdownTimer = null;
            this.emit('sendControllerCommand', this, {
              deviceName: 'server',
              command: 'shutdown',
            });
          }, 5000);
        }
        if(parseInt(value) && this.shutdownTimer) {
          console.log('buttonTrigger');
          clearTimeout(this.shutdownTimer);
          this.shutdownTimer = null;
          this.emit('sendControllerCommand', this, {
            deviceName: 'server',
            command: `sysled ${ this.systemConfig.powerLED ? 'on' : 'off' }`,
          });
          this.emit('buttonTrigger', this);
        }
      };
      fs.watch('/sys/class/gpio/gpio3/value', () => {
        fs.readFile('/sys/class/gpio/gpio3/value', 'utf8', buttonCheck);
      });
      fs.watch('/sys/class/gpio/gpio5/value', () => {
        fs.readFile('/sys/class/gpio/gpio5/value', 'utf8', buttonCheck);
      });

      try {
        fs.writeFileSync('/sys/class/gpio/export', '22');
      } catch(e) {/* empty */}
      fs.writeFileSync('/sys/class/gpio/gpio22/direction', 'in');
      this.wifiEnable = parseInt(fs.readFileSync('/sys/class/gpio/gpio22/value')) &&
        fs.existsSync('/sys/class/net/wlan0');
    }

    this.on('changeAlias', (caller) => {
      this.MakeAliasTable();
      if(caller != this) this.Registry.SetRegistry('alias', this.alias);
    });
    this.Registry.GetRegistry('alias', (err, data) => {
      this.alias = data || {};
      this.emit('changeAlias', this);
    });
    
    this.on('changeUITable', (caller) => {
      if(caller != this) this.Registry.SetRegistry('uiTable', this.uiTable);
    });
    this.Registry.GetRegistry('uiTable', (err, data) => {
      this.uiTable = data || {};
    });

    this.on('changeRemocon', (caller) => {
      if(caller != this) this.Registry.SetRegistry('remocon', this.remocon);
    });
    this.Registry.GetRegistry('remocon', (err, data) => {
      this.remocon = data || {};
    });

    this.on('changeHueBridges', (caller) => {
      if(caller != this) this.Registry.SetRegistry('hueBridges', this.hueBridges);
    });
    this.Registry.GetRegistry('hueBridges', (err, data) => {
      this.hueBridges = data || [];
    });

    this.Registry.GetRegistry('controllerLog', (err, data) => {
      this.controllerLog = data || [];
    });

    this.on('changeValue', (caller, msg) => {
      msg.device = this.aliasTable[msg.deviceName].device;
      msg.funcName = this.alias[msg.device][msg.func].name;
      msg.valueName = msg.value + this.alias[msg.device][msg.func].unit;
      msg.type = this.alias[msg.device][msg.func].type;

      let f = false;
      for(const i in this.status) {
        const st = this.status[i];
        if((st.deviceName == msg.deviceName) && (st.func == msg.func)) {
          this.status[i] = msg;
          f = true;
          break;
        }
      }
      if(!f) this.status.push(msg);
      this.emit('statusNotify', this);
    });

    this.on('changeInternalStatus', (caller) => {
      for(const func in this.internalStatus.virtualSW) {
        const val = this.internalStatus.virtualSW[func];
        let f = -1;
        for(const j in this.status) {
          if((this.status[j].device === 'server') && (this.status[j].func === func)) {
            f = j;
            break;
          }
        }
        let valueName = val;
        if(valueName == 1) valueName = 'on';
        if(valueName == 0) valueName = 'off';
        const stat = {device: 'server', deviceName: 'server', func:func, value: val, valueName: valueName};
        if(f < 0) {
          this.status.push(stat);
        } else {
          this.status[f] = stat;
        }
      }
      for(const deviceName in this.internalStatus.lastCommand) {
        if((deviceName == null) || (deviceName === 'undefined')) continue;
        if(!this.internalStatus.lastCommand[deviceName].remocon) continue;
        const val = this.internalStatus.lastCommand[deviceName].remocon;
        if(val === '') continue;
        let f = -1;
        for(const j in this.status) {
          if((this.status[j].deviceName === deviceName) && (this.status[j].func === 'remocon')) {
            f = j;
            break;
          }
        }
        const type = this.internalStatus.lastCommand[deviceName].type;
        const state = {
          lastCommand: val,
          type: type,
        };
        if(type === 'aircon') {
          const cmd = val.replace(/^.*_/, '');
          state.mode = cmd.replace(/[0-9.]*$/, '');
          state.temperature = cmd.replace(state.mode, '');
          state.prefix = val.replace(/_[^_]*$/,'');
        }
        if(f < 0) {
          if(this.aliasTable[deviceName]) {
            this.status.push({
              deviceName: deviceName,
              device: this.aliasTable[deviceName].device,
              func: 'remocon',
              valueName: val,
              state: state,
            });
          }
        } else {
          this.status[f].valueName = val;
          this.status[f].state = state;
        }
      }
      if(this.internalStatus.rainInfo != null) {
        let f = -1;
        for(const j in this.status) {
          if((this.status[j].device == 'server') && (this.status[j].func == 'rainInfo')) {
            f = j;
            break;
          }
        }
        if(this.alias[0] != null) {
          const stat = {
            device: 'server',
            deviceName: 'server',
            func:'rainInfo',
            funcName: this.alias[0].rainInfo?this.alias[0].rainInfo.name:'rainInfo',
            type: this.alias[0].rainInfo?this.alias[0].rainInfo.type:'rain',
            value: this.internalStatus.rainInfo,
            valueName: this.internalStatus.rainInfo,
          };
          if(f < 0) {
            this.status.push(stat);
          } else {
            this.status[f] = stat;
          }
        }
      }
      if((this.internalStatus.smartMeter != null) && this.alias[0]) {
        let f = -1;
        for(const j in this.status) {
          if((this.status[j].device == 'server') && (this.status[j].func == 'smartMeter')) {
            f = j;
            break;
          }
        }
        const stat = {
          device: 'server',
          deviceName: 'server',
          func: 'smartMeter',
          funcName: this.alias[0].smartMeter.name,
          type: this.alias[0].smartMeter.type,
          value: this.internalStatus.smartMeter,
          valueName: this.internalStatus.smartMeter + this.alias[0].smartMeter.unit,
        };
        if(f < 0) {
          this.status.push(stat);
        } else {
          this.status[f] = stat;
        }
      }
      this.emit('statusNotify', this);
      if(caller != this) this.Registry.SetRegistry('internalStatus', this.internalStatus);
    });
    this.Registry.GetRegistry('internalStatus', (err, data) => {
      this.internalStatus = data || {virtualSW:{}};
      this.emit('changeInternalStatus', this);
    });

    this.on('changeSystemConfig', (caller) => {
      if(caller != this) this.Registry.SetRegistry('system', this.systemConfig);
    });

    fs.watchFile(this.config.wisunDevice, (stat) => {
      this.smartMeter = stat.nlink == 1;
      this.emit('changeSmartMeter', this);
    });
    this.smartMeter = false;
    try {
      this.smartMeter = fs.statSync(this.config.wisunDevice).isCharacterDevice();
    } catch(e) {/* empty */}
    this.emit('changeSmartMeter', this);

    this.Registry.GetRegistry('system', (err, data) => {
      this.systemConfig = data || {};
      if(this.version) this.systemConfig.version = this.version;
      this.systemConfig.hap = this.config.hap;
      this.systemConfig.amesh = this.config.amesh;
      this.systemConfig.pwm = this.config.pwm;
      this.systemConfig.dmx = this.config.dmx;
      this.systemConfig.led = this.config.led;
      if(!this.systemConfig.powerLED) this.systemConfig.powerLED = this.config.powerLED;
      this.systemConfig.motor = this.config.motor;
      this.systemConfig.wifiEnable = this.wifiEnable;
      this.systemConfig.smartMeter = this.config.smartMeter;
      this.systemConfig.initialPassword = this.initialPassword;
      this.systemConfig.defaultPassword = this.defaultPassword;
      this.systemConfig.changeAuthKey = false;
      this.systemConfig.requestRemoteAccess = false;
      this.systemConfig.remote = (this.systemConfig.remote === 'on') || (this.systemConfig.remote === true);
      this.systemConfig.autoUpdate = (this.systemConfig.autoUpdate == null) || (this.systemConfig.autoUpdate === 'on') || (this.systemConfig.autoUpdate === true);
      this.systemConfig.platform = {
        name: 'GeckoLink HomeServer',
        manufacturer: 'GeckoLink',
        model: 'HomeServer',
        serial: this.serial,
      };
      this.systemConfigDirtyFlag = false;

      if(this.systemConfig.account == null) this.systemConfig.account = 'admin';
      if(this.systemConfig.password == null) this.systemConfig.password = this.initialPassword;
      if(this.systemConfig.nodeRedCredential == null) {
        this.systemConfig.nodeRedCredential = crypto.randomBytes(32).toString('base64');
        this.systemConfigDirtyFlag = true;
      }
      if(this.systemConfig.mailto == null) this.systemConfig.mailto = '';
      if(this.systemConfig.longitude == null) this.systemConfig.longitude = '';
      if(this.systemConfig.latitude == null) this.systemConfig.latitude = '';
      if(this.systemConfig.radius == null) this.systemConfig.radius = '5000';
      if(this.systemConfig.bridge == null) this.systemConfig.bridge = {};
      if(this.systemConfig.bridge.port == null) this.systemConfig.bridge.port = 51826;
      if(this.systemConfig.sessionSecret == null) {
        this.systemConfig.sessionSecret = crypto.randomBytes(32).toString('base64');
        this.systemConfigDirtyFlag = true;
      }
      if(this.systemConfig.bridge.pin == null) {
        const bytes = crypto.randomBytes(6);
        this.systemConfig.bridge.pin = ('00' + bytes.readUInt16BE(0)).slice(-3) + '-' +
                                       ('0' + bytes.readUInt16BE(2)).slice(-2) + '-' +
                                       ('00' + bytes.readUInt16BE(4)).slice(-3);
        this.systemConfigDirtyFlag = true;
      }
      if(this.systemConfig.bridge.setupID == null) {
        const bytes = crypto.randomBytes(4);
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let setupID = '';
        for (let i = 0; i < 4; i++) {
          setupID += chars.charAt(bytes.readUInt8(i) % 26);
        }
        this.systemConfig.bridge.setupID = setupID;
        this.systemConfigDirtyFlag = true;
      }
      if(this.systemConfig.bridge.setupURI == null) {
        const setupCode = parseInt(this.systemConfig.bridge.pin.replace(/-/g, ''), 10);
        const category = 2; // BRIDGE
        const encodedPayload = ('00000000' + (setupCode + ( 1 << 28) /* Supports IP */ + (category << 31) + (category  >> 1) * Math.pow(2, 32)).toString(36).toUpperCase()).slice(-9);
        this.systemConfig.bridge.setupURI = "X-HM://" + encodedPayload + this.systemConfig.bridge.setupID;
        this.systemConfigDirtyFlag = true;
      }

      this.systemConfig.bridge.changeState = true;

      if(this.systemConfig.bridge.name == null) this.systemConfig.bridge.name = 'GeckoLink-' + this.macAddr.slice(-8).replace(/:/g,'');
      if(this.systemConfig.bridge.username == null) this.systemConfig.bridge.username = this.macAddr.toUpperCase();
      this.emit('readSystemConfigDone', this);
    });

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.on('webServerStart', (_caller) => {
      if(this.user) {
        if(!this.group) this.group = this.user;
        process.initgroups(this.user, this.group);
        process.setgid(this.group);
        process.setuid(this.user);
      }
      if(this.systemConfigDirtyFlag) this.Registry.SetRegistry('system', this.systemConfig);
      this.systemConfigDirtyFlag = false;
      this.emit('initializeAfterSetUID', this);
      this.emit('changeSystemConfig', this);
      this.emit('changeHueBridges', this);
      this.emit('changeControllerLog', this, this.controllerLog);
      this.emit('statusNotify', this);
    });
  }

  MakeAliasTable() {
    this.alias[0] = {
      name: 'server',
      rainInfo: {
        name: 'アメッシュ',
        type: 'rain',
      },
      smartMeter: {
        name: '消費電力',
        type: 'energy',
        unit: 'W',
      },
    };
    for(let i = 0; i < 4; i++) {
      this.alias[0]['vsw'+i] = {
        name: '',
        valueLabel: {
          '0': 'open',
          '1': 'close',
          '2': 'off',
          '3': 'on',
        },
      };
    }
    this.aliasTable = {};
    for(const i in this.alias) {
      this.aliasTable[this.alias[i].name] = {device:i, func:'name', property:this.alias[i]};
      for(const j in this.alias[i]) {
        if(j == 'basicSelect') continue;
        if(j == 'option') continue;
        let name = this.alias[i][j].name;
        if(!name) name = this.alias[i].name + ':' + j;
        this.aliasTable[name] = {device:i, func: j, property:this.alias[i][j]};
      }
    }
  }
  
  ControllerLog(msg) {
    const m = moment();
    const log = {
      type: msg.type,
      timeStamp: m.format("YYYY/MM/DD HH:mm:ss"),
    }
    if(log.type == 'command') {
      let device = msg.device;
      if(!device || (device.length == 0)) device = this.aliasTable[msg.deviceName];
      let deviceName = msg.deviceName;
      if((!deviceName || (deviceName.length == 0)) && this.alias[device]) deviceName = this.alias[device].name;
      let command = msg.command;
      if(!command || (command.length == 0)) command = msg.func + ' ' + msg.mode;
      log.body = {
        device: device,
        deviceName: deviceName,
        command: command
      };
    } else {
      log.body = msg.data[0];
    }

    this.controllerLog.push(log);
    if(this.controllerLog.length > 100) this.controllerLog.splice(0, this.controllerLog.length - 100);
    this.emit('changeControllerLog', this, this.controllerLog);
    this.Registry.SetRegistry('controllerLog', this.controllerLog);
  }
  
  IsAnalogFunc(deviceName, func) {
    return this.analogFunc.indexOf(func) >= 0;
  }

  IsStatusFunc(deviceName, func) {
    if(this.statusFunc.indexOf(func) < 0) return false;
    if(func.match(/^gpio/) && this.aliasTable[deviceName].property[func].type == 'out') return false;
    return true;
  }
  
  IsCommandFunc(deviceName, func) {
    if(this.commandFunc.indexOf(func) < 0) return false;
    if(func.match(/^gpio/) && this.aliasTable[deviceName].property[func].type != 'out') return false;
    return true;
  }

  IsResponsiveCommandFunc(deviceName, func) {
    return this.responsiveCommandFunc.indexOf(func) >= 0;
  }
  
}

module.exports = Common;
