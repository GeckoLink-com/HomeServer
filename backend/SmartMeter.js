//
// SmartMeter.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const EchonetLite = require('node-echonet-lite');
const mSerialPort = require('serialport');

class SmartMeter {

  constructor(common) {
    this.common = common;
    this.deviceInfo = {};
    
    this.common.on('changeSystemConfig', this.Reset.bind(this));

    global.showErrorExit = (msg) => {
      console.log('SmartMeter:', msg);
      if(this.retryDiscovery > 0) this.retryDiscovery--;
      if(this.retryDiscovery == 0) {
        this.Reset();
      } else {
        this.Discovery();
      }
    };
  }
  
 Reset() {
    if(!this.common.systemConfig) return;

    if(this.el) {
      if(this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.el.close(() => { this.el = null; this.Start();});
    } else {
      this.Start();
    }
  }

  Start() {
    if(!this.common.config.smartMeter) return;
    if(!this.common.config.wisunDevice) return;
    if(!this.common.systemConfig.smartMeterAdapter) return;
    if(!this.common.systemConfig.smartMeterID) return;
    if(!this.common.systemConfig.smartMeterPassword) return;

    this.el = new EchonetLite({
      lang: 'en',
      type: 'wisunb',
      adapter: this.common.systemConfig.smartMeterAdapter, // bp35c2/bp35a1/rl7023
      path: this.common.config.wisunDevice,
      id: this.common.systemConfig.smartMeterID,
      pass: this.common.systemConfig.smartMeterPassword,
      baud: 115200,
    });

    this.el.mELNet._prepare = function(callback) {
      if(typeof(callback) !== 'function') {
        callback = function() {};
      }

      this.port = new mSerialPort(this.params['path'], {
        baudRate: this.params['baud']
      });

      this.port.on('error', (err) => {
        callback(err);
      });

      this.port.once('open', () => {
        this.initialized = true;
        this._disableEchoback(callback);
      });

      this.port.on('data', (buf) => {
        this.response_text += buf.toString('utf8');
        if(this.response_buffer === null) {
          this.response_buffer = buf;
        } else {
          this.response_buffer = Buffer.concat([this.response_buffer, buf]);
        }

        while(this.response_text.match(/\r\n$/)) {
          const sep = this.response_text.substr(1).match(/(EVENT )|(ERXUDP )|(OK)/);
          const len = sep ? sep.index + 1 : this.response_text.length;
          const blen = sep ? this.response_buffer.indexOf(sep[0], 1) : this.response_buffer.length;
          this.dataCallbackSerial(this.response_buffer.slice(0, blen));

          this.serialCallback(this.response_text.substr(0, len), this.response_buffer.slice(0, blen));
          this.response_text = this.response_text.substr(len);
          this.response_buffer = this.response_buffer.slice(blen);
        }
      });
    };

/* for DEBUG
    this.el.on('data-serial', (res) => {
      console.log('< --------');
      console.log(res.data);
      console.log('< --------');
    });
    this.el.on('sent-serial', (res) => {
      console.log('> --------');
      console.log(res.device);
      console.log(res.data);
      console.log('> --------');
    });
*/

    this.retryInitialize = 5;
    this.intervalDropCount = 0;
    this.Initialize();
  }

  Initialize() {
    this.el.init((err) => {
      if(err) {
        console.log('SmartMeter:', err.message);
        if(this.retryInitialize > 0) this.retryInitialize--;
        if(this.retryInitialize == 0) throw err;
        this.Initialize();
        return;
      }
      this.el.initialized = true;
      this.retryDiscovery = 10;
      this.Discovery();
    });
  }
  
  Discovery() {
    console.log('SmartMeter: Discovery');
    this.el.startDiscovery((err, res) => {
      if(err) {
        console.log('SmartMeter:', err.message);
        if(this.retryDiscovery > 0) this.retryDiscovery--;
        if(this.retryDiscovery == 0) throw err;
        this.Discovery();
        return;
      }
      if(!res.device || !res.device.eoj || !res.device.eoj[0]) {
        console.log('SmartMeter Exception : Error not found device');
        console.log(res);
        if(this.retryInitialize > 0) this.retryInitialize--;
        if(this.retryInitialize == 0) throw err;
        this.Initialize();
        return;
      }
      this.device = res.device;
      const groupCode = this.device.eoj[0][0];
      const classCode = this.device.eoj[0][1];
      if((groupCode == 0x02) && (classCode == 0x88)) {
        console.log('SmartMeter: Found : ', this.el.getClassName(groupCode, classCode));
        this.el.stopDiscovery();
        this.IntervalSequence();
      }
    });
  }

  IntervalSequence() {
    this.intervalDropCount++;
    if(this.intervalDropCount > 5) {
      console.log('SmartMeter: WARNING IntervalDropCount = %d', this.intervalDropCount);
      console.log('SmartMeter: restart (watchdog block)');
      process.exit(1);

/*
      this.retryInitialize = 5;
      this.intervalDropCount = 0;
      this.Initialize();
      return;
*/
    }
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.GetValue(0xe7, (err, _res) => {
      if(err) {
        console.log('SmartMeter: GetValue 0xe7 error');
        console.log(err);
      }
      this.GetValue(0xe8, (err, _res) => {
        if(err) {
          console.log('SmartMeter: GetValue 0xe8 error');
          console.log(err);
        }
        this.intervalDropCount = 0;
        const value = this.deviceInfo.energy < 0 ? -this.deviceInfo.energy : this.deviceInfo.energy;
        if(!this.common.status['server:smartMeter']) {
          this.common.status['server:smartMeter'] = {
            device: 'server',
            deviceName: 'server',
            func: 'smartMeter',
            funcName: this.common.alias[0].smartMeter ? this.common.alias[0].smartMeter.name : 'smartMeter',
            type: 'energy',
          };
        }
        this.common.status['server:smartMeter'].value = value;
        this.common.status['server:smartMeter'].valueName = `${value}${this.common.alias[0].smartMeter.unit ? this.common.alias[0].smartMeter.unit : 'W'}`;
      });
    });

    if(this.intervalId == null) {
      this.intervalId = setInterval(this.IntervalSequence.bind(this), 30 * 1000);
    }
  }

  GetValue(epc, callback) {
    this.el.getPropertyValue(this.device.address, this.device.eoj[0], epc, (err, res) => {
      if(err) console.log('SmartMeter:', err);
      for(const i in res.message.data) {
        this.deviceInfo[i] = res.message.data[i];
      }
      if(callback) callback(err, res);
    });
  }
}

module.exports = SmartMeter;
