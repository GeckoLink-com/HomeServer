//
// HomeBridgeAccessoryLightSensor.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryLightSensor extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.LightSensor, this.Name);

    service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func) || { value: 0};
      const value = parseFloat(stat.value);
      callback(null, value);
    });
    this.AddStatusChange(service, this.Item.status[this.StatusNo].func, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentAmbientLightLevel, parseFloat(stat.value));
    });
  }
}

module.exports = HomeBridgeAccessoryLightSensor;
