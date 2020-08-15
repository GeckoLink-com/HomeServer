//
// HomeBridgeAccessoryWindow.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryWindow extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService((this.Item.type === 'window') ? Service.Window : Service.WindowCovering, this.Name);

    service.getCharacteristic(Characteristic.CurrentPosition).on('get', (callback) => {
      const stat = this.SearchStatus(['sw']);
      if(stat && ((stat.valueName === 'open') || (stat.valueName === 'opening'))) {
        callback(null, 100);
      } else {
        callback(null, 0);
      }
    })
    .setProps({minStep:50});

    service.getCharacteristic(Characteristic.TargetPosition).on('get', (callback) => {
      const stat = this.SearchStatus(['sw']);
      if(stat && (stat.valueName === 'open')) {
        callback(null, 100);
      } else if(stat && ((stat.valueName === 'opening') || (stat.valueName === 'closing'))) {
        callback(null, 50);
      } else {
        callback(null, 0);
      }
    })
    .setProps({minStep:50});
    service.getCharacteristic(Characteristic.TargetPosition).on('set', (value, callback) => {
      if(this.Item.buttons != undefined) {
        const stat = this.SearchStatus(['sw']);
        if((value === 100) && stat && (stat.valueName !== 'open') && (stat.valueName !== 'opening')) {
          if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
        } else if((value === 0) && stat && (stat.valueName !== 'close') && (stat.valueName !== 'closing')) {
          if((this.Item.buttons[1] != undefined) && (this.Item.buttons[1].command)) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
          }
        }
      }
      callback();
    });

    service.getCharacteristic(Characteristic.PositionState).on('get', (callback) => {
      const stat = this.SearchStatus();
      if(stat && (stat.valueName === 'opening')) {
        callback(null, Characteristic.PositionState.INCREASING);
      } else if(stat && (stat.valueName === 'closing')) {
        callback(null, Characteristic.PositionState.DECREASING);
      } else {
        callback(null, Characteristic.PositionState.STOPPED);
      }
    });

    this.AddStatusChange(service, this.Item.status[0].func, (service, stat) => {
      if(stat.valueName === 'open') {
        service.getCharacteristic(Characteristic.CurrentPosition).updateValue(100);
        service.getCharacteristic(Characteristic.TargetPosition).updateValue(100);
        service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
      } else if(stat.valueName === 'opening') {
        service.getCharacteristic(Characteristic.CurrentPosition).updateValue(50);
        service.getCharacteristic(Characteristic.TargetPosition).updateValue(50);
        service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.INCREASING);
      } else if(stat.valueName === 'closing') {
        service.getCharacteristic(Characteristic.CurrentPosition).updateValue(50);
        service.getCharacteristic(Characteristic.TargetPosition).updateValue(50);
        service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.DECREASING);
      } else {
        service.getCharacteristic(Characteristic.CurrentPosition).updateValue(0);
        service.getCharacteristic(Characteristic.TargetPosition).updateValue(0);
        service.getCharacteristic(Characteristic.PositionState).updateValue(Characteristic.PositionState.STOPPED);
      }
    });
  }
}

module.exports = HomeBridgeAccessoryWindow;
