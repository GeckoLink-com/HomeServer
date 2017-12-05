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
const getmac = require('getmac');
const moment = require('moment');
var crypto = require('crypto');

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
    this._Registry = new registry(this.config.basePath);
    this.statusFunc = ['ad0', 'ad1', 'ad2', 'ad3', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'ha0', 'ha1', 'hai0', 'hai1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3', 'rainInfo', 'smartMeter'];
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
    try {
      const data = JSON.parse(fs.readFileSync('/boot/system.conf', 'utf8'));
      if(data.serial) this.serial = data.serial;
      if(data.initialPassword) this.initialPassword = data.initialPassword;
    } catch(e) {/* empty */}
    
    this.on('changeAlias', (caller) => {
      this._MakeAliasTable();
      if(caller != this) this._Registry.SetRegistry('alias', this.alias);
    });
    this._Registry.GetRegistry('alias', (err, data) => {
      this.alias = data || {};
      this.emit('changeAlias', this);
    });
    
    this.on('changeRemocon', (caller) => {
      if(caller != this) this._Registry.SetRegistry('remocon', this.remocon);
    });

    this._Registry.GetRegistry('remocon', (err, data) => {
      this.remocon = data || {};
      this.emit('changeRemocon', this);
    });

    this._Registry.GetRegistry('hueBridges', (err, data) => {
      this.hueBridges = data || [];
      this.emit('changeHueBridges', this);
    });

    this._Registry.GetRegistry('controllerLog', (err, data) => {
      this.controllerLog = data || [];
      this.emit('changeControllerLog', this, this.controllerLog);
    });

    this.on('changeInternalStatus', (caller) => {
      for(let func in this.internalStatus.virtualSW) {
        const val = this.internalStatus.virtualSW[func];
        let f = -1;
        for(let j in this.status) {
          if((this.status[j].device == 'server') && (this.status[j].func == func)) {
            f = j;
            break;
          }
        }
        const stat = {device: 'server', deviceName: 'server', func:func, value: val, valueName: ((val == 1)||(val == 'on')?'on':'off')};
        if(f < 0) {
          this.status.push(stat);
        } else {
          this.status[f] = stat;
        }
      }
      if(this.internalStatus.rainInfo != null) {
        let f = -1;
        for(let j in this.status) {
          if((this.status[j].device == 'server') && (this.status[j].func == 'rainInfo')) {
            f = j;
            break;
          }
        }
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
      if(this.internalStatus.smartMeter != null) {
        let f = -1;
        for(let j in this.status) {
          if((this.status[j].device == 'server') && (this.status[j].func == 'smartMeter')) {
            f = j;
            break;
          }
        }
        const stat = {
          device: 'server',
          deviceName: 'server',
          func:'smartMeter',
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
      if(caller != this) this._Registry.SetRegistry('internalStatus', this.internalStatus);
    });
    this._Registry.GetRegistry('internalStatus', (err, data) => {
      this.internalStatus = data || {virtualSW:{}};
      this.emit('changeInternalStatus', this);
    });

    this.on('changeUITable', (caller) => {
      if(caller != this) this._Registry.SetRegistry('uiTable', this.uiTable);
    });
    this._Registry.GetRegistry('uiTable', (err, data) => {
      this.uiTable = data || {};
      this.emit('changeUITable', this);
    });

    this.on('changeHueBridges', (caller) => {
      if(caller != this) this._Registry.SetRegistry('hueBridges', this.hueBridges);
    });

    this.on('changeSystemConfig', (caller) => {
      if(caller != this) this._Registry.SetRegistry('system', this.systemConfig);
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

    this._Registry.GetRegistry('system', (err, data) => {
      this.systemConfig = data;
      if(this.systemConfig) {
        if(this.version) this.systemConfig.version = this.version;
        this.systemConfig.hap = this.config.hap;
        this.systemConfig.led = this.config.led;
        this.systemConfig.motor = this.config.motor;
        this.systemConfig.smartMeter = this.config.smartMeter;
        this.systemConfig.initialPassword = this.initialPassword;
        this.systemConfig.defaultPassword = this.defaultPassword;
        this.emit('changeSystemConfig', this);
        return;
      }

      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const bytes = crypto.randomBytes(10);
      const pin = ('00' + bytes.readUInt16BE(0)).slice(-3) +
            '-' + ('0' + bytes.readUInt16BE(2)).slice(-2) +
            '-' + ('00' + bytes.readUInt16BE(4)).slice(-3);
      let setupID = '';
      for (let i = 0; i < 4; i++) {
        setupID += chars.charAt(bytes.readUInt8(i) % 26);
      }
      const setupCode = parseInt(pin.replace(/-/g, ''), 10);
      const category = 2; // BRIDGE
      const encodedPayload = ('00000000' + (setupCode + ( 1 << 28) /* Supports IP */ + (category << 31) + (category  >> 1) * Math.pow(2, 32)).toString(36).toUpperCase()).slice(-9);
      const setupURI = "X-HM://" + encodedPayload + setupID;

      getmac.getMac((err, macAddr) => {
        this.systemConfig = {
          account: 'admin',
          password: this.initialPassword,
          initialPassword: this.initialPassword,
          defaultPassword: this.defaultPassword,
          autoUpdate: 'on',
          remote: 'off',
          mailto: '',
          longitude: '',
          latitude: '',
          radius: '5000',
          version: this.version,
          hap: this.config.hap,
          amesh: this.config.amesh,
          smartMeter: this.config.smartMeter,
          bridge: {
            name: 'GeckoLink-' + macAddr.slice(-8).replace(/:/g,''),
            port: 51826,
            username: macAddr.toUpperCase(),
            pin: pin,
            setupID: setupID,
            setupURI: setupURI,
          },
          platform: {
            name: 'GeckoLink HomeServer',
            manufacturer: 'GeckoLink',
            model: 'HomeServer',
            serial: this.serial,
          },
        };
        this.emit('changeSystemConfig', this);
      });
    });
  }

  _MakeAliasTable() {
    if(!(0 in this.alias)) {
      this.alias[0] = {name:'server'};
      for(let i = 0; i < 4; i++) {
        this.alias[0]['vsw'+i] = {name:'', valueLabel:{'0':'off', '1':'on'}};
      }
      this.alias[0]['rainInfo'] = {name:'アメッシュ', type: 'rain' };
      this.alias[0]['smartMeter'] = {name:'消費電力', type: 'energy', unit: 'W' };
    }
    this.aliasTable = {};
    for(let i in this.alias) {
      this.aliasTable[this.alias[i].name] = {device:i, func:'name', property:this.alias[i]};
      for(let j in this.alias[i]) {
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
    this._Registry.SetRegistry('controllerLog', this.controllerLog);
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
