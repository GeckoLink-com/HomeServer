//
// HomeBridgeAccessoryLockMechanism.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryLockMechanism extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.LockMechanism, this.Name);
    
    service.getCharacteristic(Characteristic.LockCurrentState).on('get', (callback) => {
      const stat = this.SearchStatus(['ha0', 'ha1']);
      if(stat && (stat.valueName === "close")) {
        callback(null, Characteristic.LockCurrentState.SECURED);
      } else {
        callback(null, Characteristic.LockCurrentState.UNSECURED);
      }
    });

    service.getCharacteristic(Characteristic.LockTargetState).on('get', (callback) => {
      const stat = this.SearchStatus(['ha0', 'ha1']);
      if(stat && (stat.valueName === "close")) {
        callback(null, Characteristic.LockTargetState.SECURED);
      } else {
        callback(null, Characteristic.LockTargetState.UNSECURED);
      }
    });
    service.getCharacteristic(Characteristic.LockTargetState).on('set', (value, callback) => {
      if(this.Item.buttons != undefined) {
        if(value == Characteristic.LockTargetState.UNSECURED) {
          if(this.Item.buttons[0] && this.Item.buttons[0].func) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].func + ' ' + this.Item.buttons[0].mode);
          } else if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
        } else {
          if(this.Item.buttons[1] && this.Item.buttons[1].func) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].func + ' ' + this.Item.buttons[1].mode);
          } else if(this.Item.buttons[1] && this.Item.buttons[1].command) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
          }
        }
      }
      callback();
    });

    this.AddStatusChange(service, this.Item.status[0].func, (service, stat) => {
      if(stat.valueName === 'close') {
        service.getCharacteristic(Characteristic.LockCurrentState).updateValue(Characteristic.LockCurrentState.SECURED);
        service.getCharacteristic(Characteristic.LockTargetState).updateValue(Characteristic.LockTargetState.SECURED);
      } else {
        service.getCharacteristic(Characteristic.LockCurrentState).updateValue(Characteristic.LockCurrentState.UNSECURED);
        service.getCharacteristic(Characteristic.LockTargetState).updateValue(Characteristic.LockTargetState.UNSECURED);
      }
    });
  }
}

module.exports = HomeBridgeAccessoryLockMechanism;
