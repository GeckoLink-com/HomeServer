//
// HomeBridgeAccessoryNoiseSensor.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryNoiseSensor extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.AirQualitySensor, this.Name);

    service.getCharacteristic(Characteristic.AirQuality).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func) || { value: 0};
      const value = parseInt(stat.value);
      let quarity = Characteristic.AirQuality.EXCELLENT;
      if(value >= 10) quarity = Characteristic.AirQuality.GOOD;
      if(value >= 20) quarity = Characteristic.AirQuality.FAIR;
      if(value >= 40) quarity = Characteristic.AirQuality.INFERIOR;
      if(value >= 60) quarity = Characteristic.AirQuality.POOR;
      callback(null, quarity);
    });

    service.addCharacteristic(Characteristic.OzoneDensity);
    service.getCharacteristic(Characteristic.OzoneDensity).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func) || { value: 0};
      const value = parseFloat(stat.value * 10);
      callback(null, value);
    });

    this.AddStatusChange(service, this.Item.status[this.StatusNo].func, (service, stat) => {
      const value = parseInt(stat.value);
      let quarity = Characteristic.AirQuality.EXCELLENT;
      if(value >= 10) quarity = Characteristic.AirQuality.GOOD;
      if(value >= 20) quarity = Characteristic.AirQuality.FAIR;
      if(value >= 40) quarity = Characteristic.AirQuality.INFERIOR;
      if(value >= 60) quarity = Characteristic.AirQuality.POOR;
      service.setCharacteristic(Characteristic.AirQuality, quarity);
      service.setCharacteristic(Characteristic.OzoneDensity, parseFloat(stat.value * 10));
    });
  }
}

module.exports = HomeBridgeAccessoryNoiseSensor;
