//
// HomeBridgeAccessoryMotionSensor.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryMotionSensor extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.MotionSensor, this.Name);

    service.getCharacteristic(Characteristic.MotionDetected).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func) || { value: 0};
      const value = parseFloat(stat.value);
      callback(null, value);
    });

    this.AddStatusChange(service, 'motion', (service, stat) => {
      service.setCharacteristic(Characteristic.MotionDetected, stat.value);
    });
  }
}

module.exports = HomeBridgeAccessoryMotionSensor;
