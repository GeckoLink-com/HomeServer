//
// HomeBridgeAccessoryBatteryService.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');
const Categories = require("hap-nodejs").Categories;

class HomeBridgeAccessoryBatteryService extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    this.category = Categories.SENSOR;
    const service = this.addService(Service.BatteryService, this.Name);

    service.getCharacteristic(Characteristic.BatteryLevel).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.deviceName, this.Item.func) || { value: 50 };
      const value = stat.value || 50;
      console.log('BatteryLevel',value);
      callback(null, value);
    });

    service.getCharacteristic(Characteristic.ChargingState).on('get', (callback) => {
      console.log('ChargingState');
      callback(null, Characteristic.ChargingState.NOT_CHARGING);
    });

    service.getCharacteristic(Characteristic.StatusLowBattery).on('get', (callback) => {
      console.log('StatusLowBattery');
      callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    });

    service.setCharacteristic(Characteristic.BatteryLevel, 50);

    this.AddStatusChange(service, 'battery', (service, stat) => {
      const value = (parseFloat(stat.value || 12500) - 12000) / 10;
      service.setCharacteristic(Characteristic.BatteryLevel, value);
    });
  }
}

module.exports = HomeBridgeAccessoryBatteryService;
