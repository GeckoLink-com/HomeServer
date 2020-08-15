//
// HomeBridgeAccessoryColorLight.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class HomeBridgeAccessoryColorLight extends HomeBridgeAccessory {

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
      if(this.Item.table.type === 'led') {
        const [_h, _s, v] = this.RGBtoHSV(stat.value || {value: '000000'});
        brightness = v;
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [_h, _s, v] = this.RGBtoHSV(red, green, blue);
        brightness = v;
      }
      callback(null, brightness);
    });
    service.getCharacteristic(Characteristic.Brightness).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'led') {
        const [h, s, _v] = this.RGBtoHSV(stat.value || { value: '000000'});
        const [rgb, _r, _g, _b] = this.HSVtoRGB(h, s, value);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${rgb}`);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [h, s, _v] = this.RGBtoHSV(red, green, blue);
        const [_rgb, r, g, b] = this.HSVtoRGB(h, s, value);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${this.Item.table.dmxAddress - 1} ${r} ${g} ${b}`);
      }
      callback();
    });

    service.addCharacteristic(Characteristic.Saturation);
    service.getCharacteristic(Characteristic.Saturation).on('get', (callback) => {
      let saturation = null;
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'led') {
        const [_h, s, _v] = this.RGBtoHSV(stat.value || { value: '000000'});
        saturation = s;
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [_h, s, _v] = this.RGBtoHSV(red, green, blue);
        saturation = s;
      }
      callback(null, saturation);
    });
    service.getCharacteristic(Characteristic.Saturation).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'led') {
        const [h, _s, v] = this.RGBtoHSV(stat.value || {value: '000000'});
        const [rgb, _r, _g, _b] = this.HSVtoRGB(h, value, v)
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${rgb}`);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [h, _s, v] = this.RGBtoHSV(red, green, blue);
        const [_rgb, r, g, b] = this.HSVtoRGB(h, value, v);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${this.Item.table.dmxAddress - 1} ${r} ${g} ${b}`);
      }
      callback();
    });

    service.addCharacteristic(Characteristic.Hue);
    service.getCharacteristic(Characteristic.Hue).on('get', (callback) => {
      let hue = null;
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'led') {
        const [h, _s, _v] = this.RGBtoHSV(stat.value || {value: '000000'});
        hue = h;
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [h, _s, _v] = this.RGBtoHSV(red, green, blue);
        hue = h;
      }
      callback(null, hue);
    });
    service.getCharacteristic(Characteristic.Hue).on('set', (value, callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.type);
      if(this.Item.table.type === 'led') {
        const [_h, s, v] = this.RGBtoHSV(stat.value || {value: '000000'});
        const [rgb, _r, _g, _b] = this.HSVtoRGB(value, s, v)
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${rgb}`);
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        const [_h, s, v] = this.RGBtoHSV(red, green, blue);
        const [_rgb, r, g, b] = this.HSVtoRGB(value, s, v);
        this.SendCommand(this.Item.table.deviceName, `${this.Item.table.type} ${this.Item.table.dmxAddress - 1} ${r} ${g} ${b}`);
      }
      callback();
    });

    this.AddStatusChange(service, 'switch', (service, stat) => {
      if(stat.value === 'on') {
        service.getCharacteristic(Characteristic.On).updateValue(true);
      } else {
        service.getCharacteristic(Characteristic.On).updateValue(false);
      }
    });
    this.AddStatusChange(service, this.Item.table.type, (service, stat) => {
      let hue = null;
      let saturation = null;
      let brightness = null;
      if(this.Item.table.type === 'led') {
        [hue, saturation, brightness] = this.RGBtoHSV(stat.value || '808080');
      }
      if(this.Item.table.type === 'dmx') {
        const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
        [hue, saturation, brightness] = this.RGBtoHSV(red, green, blue);
      }
      service.getCharacteristic(Characteristic.Hue).updateValue(hue);
      service.getCharacteristic(Characteristic.Saturation).updateValue(saturation);
      service.getCharacteristic(Characteristic.Brightness).updateValue(brightness);
    });
  }
}

module.exports = HomeBridgeAccessoryColorLight;
