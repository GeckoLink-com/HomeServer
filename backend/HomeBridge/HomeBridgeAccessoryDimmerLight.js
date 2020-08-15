//
// HomeBridgeAccessoryDimmerLight.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class HomeBridgeAccessoryDimmerLight extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.Lightbulb, this.Name);

    service.getCharacteristic(Characteristic.On).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, 'switch');
      if(stat && ((stat.value === "on") || (stat.value === true))) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
    service.getCharacteristic(Characteristic.On).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, 'switch');
      const oldValue = stat && ((stat.value === "on") || (stat.value === true));
      if(this.Item.buttons && (oldValue !== value)) {
        if(value) {
          if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
            this.SetStatus(this.Item.table.deviceName, 'switch', 'on');
          } else {
            this.SendCommand(this.Item.table.deviceName, 'switch on');
          }
        } else {
          if(this.Item.buttons[1] && this.Item.buttons[1].command) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
            this.SetStatus(this.Item.table.deviceName, 'switch', 'off');
          } else if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
            this.SetStatus(this.Item.table.deviceName, 'switch', 'off');
          } else {
            this.SendCommand(this.Item.table.deviceName, 'switch off');
          }
        }
      }
      callback();
    });

    service.addCharacteristic(Characteristic.Brightness);
    service.getCharacteristic(Characteristic.Brightness).on('get', (callback) => {
      let brightness = null;
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'hue') {
        const bri = (stat.state && stat.state.bri) ? stat.state.bri : '128';
        brightness = Math.round((parseInt(bri) - 1) * 100 / 253 + 1);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, bri, _ct] = (stat.value || '0 128 128').split(/[ ,]/);
        brightness = Math.round((parseInt(bri) - 1) * 100 / 254 + 1);
      }
      if(this.Item.table.type === 'pwm') {
        const [bri, _ct] = (stat.value || '128 128').split(/[ ,]/);
        brightness = Math.round((parseInt(bri) - 1) * 100 / 254 + 1);
      }
      callback(null, brightness);
    });
    service.getCharacteristic(Characteristic.Brightness).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'hue') {
        const ct = (stat.state && stat.state.ct) ? parseInt(stat.state.ct) : '182';
        this.SendCommand(this.Item.table.deviceName, `ct ${ct} ${Math.round(value * 253 / 100 + 1)}`);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, _bri, ct] = (stat.value || '0 128 128').split(/[ ,]/);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${this.Item.table.dmxAddress - 1} ${Math.round(value * 254 / 100 + 1)} ${ct}`);
      }
      if(this.Item.table.type === 'pwm') {
        const [_bri, ct] = (stat.value || '128 128').split(/[ ,]/);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${Math.round(value * 254 / 100 + 1)} ${ct}`);
      }
      callback();
    });

    service.addCharacteristic(Characteristic.ColorTemperature);
    service.getCharacteristic(Characteristic.ColorTemperature).on('get', (callback) => {
      let mirek = null;
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'hue') {
        mirek = (stat.state && stat.state.ct) ? parseInt(stat.state.ct) : 182;
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, _bri, ct] = (stat.value || '0 128 128').split(/[ ,]/);
        mirek = 1000000 / ((parseInt(ct) - 1) * 4500 / 254 + 2000);
      }
      if(this.Item.table.type === 'pwm') {
        const [_bri, ct] = (stat.value || '128 128').split(/[ ,]/);
        mirek = 1000000 / ((parseInt(ct) - 1) * 4500 / 254 + 2000);
      }
      mirek = Math.round(mirek);
      if(mirek < 40) mirek = 40;
      if(mirek > 400) mirek = 400;
      callback(null, mirek);
    });
    service.getCharacteristic(Characteristic.ColorTemperature).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'hue') {
        const bri = (stat.state && stat.state.bri) ? stat.state.bri : 128;
        this.SendCommand(this.Item.table.deviceName, `ct ${value} ${bri}`);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, bri, _ct] = (stat.value || '0 128 128').split(/[ ,]/);
        let ct = Math.round(((1000000 / ((value < 40) ? 40 : value)) - 2000) * 254 / 4500 + 1);
        if(ct < 0) ct = 1;
        if(ct > 254) ct = 254;
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${this.Item.table.dmxAddress - 1} ${bri} ${ct}`);
      }
      if(this.Item.table.type === 'pwm') {
        const [bri, _ct] = (stat.value || '128 128').split(/[ ,]/);
        let ct = Math.round(((1000000 / ((value < 40) ? 40 : value)) - 2000) * 254 / 4500 + 1);
        if(ct < 0) ct = 1;
        if(ct > 254) ct = 254;
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${bri} ${ct}`);
      }
      callback();
    });

    this.AddStatusChange(service, 'switch', (service, stat) => {
      if((stat.value === 'on') || (stat.value === true)) {
        service.getCharacteristic(Characteristic.On).updateValue(true);
      } else {
        service.getCharacteristic(Characteristic.On).updateValue(false);
      }
    });
    this.AddStatusChange(service, this.Item.table.type, (service, stat) => {
      let brightness = 128;
      let mirek = 182;
      if(this.Item.table.type === 'hue') {
        const bri = (stat.state && stat.state.bri) ? stat.state.bri : 128;
        brightness = Math.round((bri - 1) * 100 / 253);
        mirek = (stat.state && stat.state.ct) ? parseInt(stat.state.ct) : 182;
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, br, ct] = (stat.value || '0 128 128').split(/[ ,]/);
        brightness = Math.round((parseInt(br) - 1) * 100 / 254);
        mirek = 1000000 / ((parseInt(ct) - 1) * 4500 / 254 + 2000);
      }
      if(this.Item.table.type === 'pwm') {
        const [br, ct] = (stat.value || '128 128').split(/[ ,]/);
        brightness = Math.round((parseInt(br) - 1) * 100 / 254);
        mirek = 1000000 / ((parseInt(ct) - 1) * 4500 / 254 + 2000);
      }
      if(brightness > 100) brightness = 100;
      if(mirek < 40) mirek = 40;
      if(mirek > 400) mirek = 400;
      service.getCharacteristic(Characteristic.ColorTemperature).updateValue(mirek);
      service.getCharacteristic(Characteristic.Brightness).updateValue(brightness);
    });
  }
}

module.exports = HomeBridgeAccessoryDimmerLight;
