//
// HomeBridgeAccessoryThermostat.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgeAccessoryThermostat extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    const service = this.addService(Service.Thermostat, this.Name);

    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      let v = Characteristic.CurrentHeatingCoolingState.OFF;
      if(stat.mode == 'heater') {
        v = Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if(stat.mode == 'cooler') {
        v = Characteristic.CurrentHeatingCoolingState.COOL;
      } else if(stat.mode == 'auto') {
        v = Characteristic.CurrentHeatingCoolingState.AUTO;
      } else {
        v = null;
      }
      const stat2 = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!stat2.valueName || (stat2.valueName === 'off')) {
        v = Characteristic.CurrentHeatingCoolingState.OFF;
      }
      callback(null, v);
    });
    
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      let v = Characteristic.TargetHeatingCoolingState.OFF;
      if(stat.mode === 'heater') {
        v = Characteristic.TargetHeatingCoolingState.HEAT;
      } else if(stat.mode === 'cooler') {
        v = Characteristic.TargetHeatingCoolingState.COOL;
      } else if(stat.mode === 'auto') {
        v = Characteristic.CurrentHeatingCoolingState.AUTO;
      } else {
        v = null;
      }
      const stat2 = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!stat2.valueName || (stat2.valueName === 'off')) {
        v = Characteristic.TargetHeatingCoolingState.OFF;
      }
      callback(null, v);
    });
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('set', (value, callback) => {
      console.log('set TargetHeatingCoolingState ', value);
      if(value === Characteristic.CurrentHeatingCoolingState.OFF) {
        const stat = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
        if(!stat.valueName || (stat.valueName !== 'off')) {
          if(this.Item.buttons && this.Item.buttons[0] && (this.Item.buttons[0].mode === 'off')) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          } else {
            this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_off');
          }
        }
      } else {
        const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
        let mode = 'cooler';
        if(value === Characteristic.CurrentHeatingCoolingState.HEAT) mode = 'heater';
        //if(value === Characteristic.CurrentHeatingCoolingState.AUTO) mode = 'auto';
        let temp = parseInt(stat[mode] || '26');
        this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_' + mode + temp);
      }
      callback();
    });

    service.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
      const stat = this.SearchStatus('temp');
      callback(null, parseFloat(stat.value));
    });

    service.getCharacteristic(Characteristic.TargetTemperature).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      const temp = parseInt((stat.value || '26').replace(/^[^0-9]*/, ''));
      callback(null, temp);
    });
    service.getCharacteristic(Characteristic.TargetTemperature).on('set', (value, callback) => {
      console.log('set TargetTemperature ', value);
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      let mode = stat.mode;
      if(!mode) {
        const stat2 = this.SearchStatus('temp');
        const currentTemp = parseFloat(stat2.value || '26');
        if(currentTemp < 25) {
          mode = 'heater';
        } else {
          mode = 'cooler';
        }
      }
      this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_' + mode + parseInt(value));
      callback();
    });

    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('get', (callback) => {
      callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    });
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('set', (value, callback) => {
      callback();
    });
    
    this.AddStatusChange(service, 'temp', (service, stat) => {
      service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(parseFloat(stat.value));
    });
    this.AddStatusChange(service, [this.Item.table.prefix, 'ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3'], (service) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      let v = Characteristic.TargetHeatingCoolingState.OFF;
      if(stat.mode === 'heater') {
        v = Characteristic.TargetHeatingCoolingState.HEAT;
      } else if(stat.mode === 'cooler') {
        v = Characteristic.TargetHeatingCoolingState.COOL;
      } else if(stat.mode === 'auto') {
        v = Characteristic.TargetHeatingCoolingState.AUTO;
      }
      const stat2 = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!stat2.valueName || (stat2.valueName == 'off')) v = Characteristic.TargetHeatingCoolingState.OFF;
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(v);
      service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(v)
;
      if(stat.mode && stat[stat.mode]) service.getCharacteristic(Characteristic.TargetTemperature).updateValue(parseInt(stat[stat.mode]));
    });
  }
}

module.exports = HomeBridgeAccessoryThermostat;
