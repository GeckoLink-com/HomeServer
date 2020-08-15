//
// HomeBridgeAccessorySwitch.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessorySwitch extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.Switch, this.Name);

    service.getCharacteristic(Characteristic.On).on('get', (callback) => {
      const stat = this.SearchStatus(['ha0', 'ha1', 'sw', 'gpio0', 'gpio1', 'gpio', 'gpio3', 'vsw0', 'vsw1', 'vsw2', 'vsw3']);
      if(stat && (stat.valueName === "on")) {
        callback(null, true);
      } else if(stat && (stat.valueName === "off")) {
        callback(null, false);
      } else if(this.state) {
        callback(null, this.state);
      } else {
        callback(null, false);
      }
    });
    service.getCharacteristic(Characteristic.On).on('set', (value, callback) => {
      if((this.Item.buttons != undefined) && (this.state != value)) {
        if(value) {
          if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
          this.state = true;
        } else {
          if(this.Item.buttons[1] && this.Item.buttons[1].command) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
          } else if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
          this.state = false;
        }
      }
      callback();
    });

    if(!this.Item.status) return;
    this.AddStatusChange(service, this.Item.status[0].func, (service, stat) => {
      if(stat.valueName === 'on') {
        this.state = true;
        service.getCharacteristic(Characteristic.On).updateValue(true);
      } else {
        this.state = false;
        service.getCharacteristic(Characteristic.On).updateValue(false);
      }
    });
  }
}

module.exports = HomeBridgeAccessorySwitch;
