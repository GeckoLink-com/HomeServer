//
// SmartMeter.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const EchonetLite = require('node-echonet-lite');

class SmartMeter {

  constructor(common) {
    this._common = common;
    this._deviceInfo = {};
    
    this._common.on('changeSystemConfig', this.Reset.bind(this));

    global.showErrorExit = (msg) => {
      console.log('SmartMeter:', msg);
      this.retryDiscovery--;
      if(this.retryDiscovery == 0) {
        this.Reset();
      } else {
        this.Discovery();
      }
    };
  }
  
 Reset() {
    if(!this._common.systemConfig) return;
    
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
    if(!this._common.config.smartMeter) return;
    if(!this._common.config.wisunDevice) return;
    if(!this._common.systemConfig.smartMeterAdapter) return;
    if(!this._common.systemConfig.smartMeterID) return;
    if(!this._common.systemConfig.smartMeterPassword) return;

    this.el = new EchonetLite({
      lang: 'en',
      type: 'wisunb',
      adapter: this._common.systemConfig.smartMeterAdapter, // bp35a1 or rl7023
      path: this._common.config.wisunDevice,
      id: this._common.systemConfig.smartMeterID,
      pass: this._common.systemConfig.smartMeterPassword,
      baud: 115200,
    });
    this.retryInitialize = 5;
    this.intervalDropCount = 0;
    this.Initialize();
  }

  Initialize() {
    this.el.init((err) => {
      if(err) {
        console.log('SmartMeter:', err.message);
        this.retryInitialize--;
        if(this.retryInitialize == 0) throw err;
        this.Initialize();
        return;
      }
      this.retryDiscovery = 10;
      this.Discovery();
    });
  }
  
  Discovery() {
    console.log('SmartMeter: Discovery');
    this.el.startDiscovery((err, res) => {
      if(err) {
        console.log('SmartMeter:', err.message);
        this.retryDiscovery--;
        if(this.retryDiscovery == 0) throw err;
        this.Discovery();
        return;
      }
      if(!res.device || !res.device.eoj || !res.device.eoj[0]) {
        console.log('SmartMeter Exception : Error not found device');
        console.log(res);
        this.retryInitialize--;
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
    console.log('SmartMeter: Interval\n');
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
    this.GetValue(0xe7, (err, res) => {
      console.log('SmartMeter: 0xe7\n');
      if(err) {
        console.log('SmartMeter: GetValue 0xe7 error');
        console.log(err);
      }
      this.GetValue(0xe8, (err, res) => {
        console.log('SmartMeter: 0xe8\n');
        if(err) {
          console.log('SmartMeter: GetValue 0xe8 error');
          console.log(err);
        }
        this._common.internalStatus.smartMeter = this._deviceInfo.energy;
        this._common.emit('changeInternalStatus', this);
        console.log('SmartMeter: ', this._deviceInfo.energy);
        this.intervalDropCount = 0;
      });
    });

    if(this.intervalId == null) {
      this.intervalId = setInterval(this.IntervalSequence.bind(this), 30 * 1000);
    }
  }

  GetValue(epc, callback) {
    this.el.getPropertyValue(this.device.address, this.device.eoj[0], epc, (err, res) => {
      if(err) console.log('SmartMeter:', err);
      for(let i in res.message.data) {
        this._deviceInfo[i] = res.message.data[i];
      }
      if(callback) callback(err, res);
    });
  }
}

module.exports = SmartMeter;
