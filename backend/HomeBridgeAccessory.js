//
// HomeBridgeAccessory.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const uuid = require("hap-nodejs").uuid;
const Accessory = require("hap-nodejs").Accessory;
const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;

class HomeBridgeAccessory extends Accessory {

  constructor(room, name, item, config, api) {

    console.log('Initializing platform accessory %s...', name);
    super(name, uuid.generate(config.platform.name + ':' + room + name));

    this._uuid = uuid.generate(config.platform.name + ':' + room + name);
    this._Name = name;
    this._Item = item;
    this._SendCommand = api.SendCommand;
    this._GetStatus = api.GetStatus;
    this._GetUITable = api.GetUITable;
    this._AddStatusChangeEvent = api.AddStatusChangeEvent;
    this._RemoveStatusChangeEvent = api.RemoveStatusChangeEvent;
    this._SetLastCommand = api.SetLastCommand;
    this._GetLastCommand = api.GetLastCommand;

    this.on('identify', (paired, callback) => {
      console.log('%s : Identify requested!', this._Name);
      callback();
    });
    
    this.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, config.platform.manufacturer)
      .setCharacteristic(Characteristic.Model, config.platform.model)
      .setCharacteristic(Characteristic.SerialNumber, config.platform.serial);
    
    let service = null;
    switch(this._Item.type) {
// control
      case 'onOff':
      case 'openClose':
      case 'status':
      case 'other':
      case 'tv':
      case 'hue':
      case 'light':
        service = this._ServiceSwitch();
        break;
      case 'lock':
        service = this._ServiceLockMechanism();
        break;
      case 'window':
      case 'shutter':
      case 'brind':
        service = this._ServiceWindow();
        break;
      case 'aircon':
        service = this._ServiceThermostat();
        break;
// sensor
      case 'battery':
        service = this._ServiceBatteryService();
        break;
      case 'temp':
        service = this._ServiceTemperatureSensor();
        break;
      case 'humidity':
        service = this._ServiceHumiditySensor();
        break;
      default:
        console.log('error : %s', this._Item.type);
        return;
    }
    this.addService(service);
  }

  removeAllListeners() {
    super.removeAllListeners();
    this._RemoveStatusChangeEvent(this._uuid);
  }
  
  _SearchStatus(typeOrFunc) {
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      for(const s in this._Item.status) {
        if(this._Item.status[s].type == t) return this._GetStatus(this._Item.status[s].deviceName, this._Item.status[s].func);
        if(this._Item.status[s].func == t) return this._GetStatus(this._Item.status[s].deviceName, this._Item.status[s].func);
      }
    }
  }

  _AddStatusChange(service, callback, typeOrFunc) {
    if(this._Item.status == undefined) return;
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      for(const s in this._Item.status) {
        if((this._Item.status[s].type == t) || (this._Item.status[s].func == t))
          this._AddStatusChangeEvent(this._Item.status[s].deviceName, this._Item.status[s].func, this._uuid, service, callback);
      }
    }
  }
  
  _ServiceSwitch() {
    const service = new Service.Switch(this._Name);

    service.getCharacteristic(Characteristic.On).on('get', (callback) => {
      const value = this._SearchStatus(['ha0', 'ha1', 'sw', 'gpio0', 'gpio1', 'gpio', 'gpio3']);
      if(value == "on") {
        callback(null, true);
      } else if(value == "off"){
        callback(null, false);
      } else if(this._state) {
        callback(null, this._state);
      } else {
        callback(null, false);
      }
    });

    service.getCharacteristic(Characteristic.On).on('set', (value, callback) => {
      if((this._Item.buttons != undefined) && (this._state != value)) {
        if(value) {
          if(this._Item.buttons[0] && this._Item.buttons[0].command) {
            this._SendCommand(this._Item.buttons[0].deviceName, this._Item.buttons[0].command);
          }
          this._state = true;
        } else {
          if(this._Item.buttons[1] && this._Item.buttons[1].command) {
            this._SendCommand(this._Item.buttons[1].deviceName, this._Item.buttons[1].command);
          } else if(this._Item.buttons[0] && this._Item.buttons[0].command) {
            this._SendCommand(this._Item.buttons[0].deviceName, this._Item.buttons[0].command);
          }
          this._state = false;
        }
      }
      callback();
    });
    
    this._AddStatusChange(service, (service, stat) => {
      if(stat.valueName == "on") {
        this._state = true;
        service.setCharacteristic(Characteristic.On, true);
      } else {
        this._state = false;
        service.setCharacteristic(Characteristic.On, false);
      }
    });
    return service;
  }
  
  _ServiceLockMechanism() {
    const service = new Service.LockMechanism(this._Name);
    service.getCharacteristic(Characteristic.LockCurrentState).on('get', (callback) => {
      const value = this._SearchStatus(['ha0', 'ha1']);
      if(value == "close") {
        callback(null, Characteristic.LockCurrentState.SECURED);
      } else {
        callback(null, Characteristic.LockCurrentState.UNSECURED);
      }
    });
    service.getCharacteristic(Characteristic.LockTargetState).on('get', (callback) => {
      const value = this._SearchStatus(['ha0', 'ha1']);
      if(value == "close") {
        callback(null, Characteristic.LockTargetState.SECURED);
      } else {
        callback(null, Characteristic.LockTargetState.UNSECURED);
      }
    });
    service.getCharacteristic(Characteristic.LockTargetState).on('set', (value, callback) => {
      if(this._Item.buttons != undefined) {
        if(value == Characteristic.LockTargetState.UNSECURED) {
          if(this._Item.buttons[0] && this._Item.buttons[0].func) {
            this._SendCommand(this._Item.buttons[0].deviceName, this._Item.buttons[0].func + ' ' + this._Item.buttons[0].mode);
          } else if(this._Item.buttons[0] && this._Item.buttons[0].command) {
            this._SendCommand(this._Item.buttons[0].deviceName, this._Item.buttons[0].command);
          }
        } else {
          if(this._Item.buttons[1] && this._Item.buttons[1].func) {
            this._SendCommand(this._Item.buttons[1].deviceName, this._Item.buttons[1].func + ' ' + this._Item.buttons[1].mode);
          } else if(this._Item.buttons[1] && this._Item.buttons[1].command) {
            this._SendCommand(this._Item.buttons[1].deviceName, this._Item.buttons[1].command);
          }
        }
      }
      callback();
    });
    this._AddStatusChange(service, (service, stat) => {
      if(stat.valueName == "close") {
        service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
      } else {
        service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
      }
    });
    return service;
  }

  _ServiceWindow() {
    let service;
    if(this._Item.type == 'window') service = new Service.Window(this._Name);
    if(this._Item.type == 'brind') service = new Service.WindowCovering(this._Name);
    if(this._Item.type == 'shutter') service = new Service.WindowCovering(this._Name);
    service.getCharacteristic(Characteristic.CurrentPosition).on('get', (callback) => {
      const value = this._SearchStatus(['sw']);
      if((value == 'open') || (value == 'opening')) {
        callback(null, 100);
      } else {
        callback(null, 0);
      }
    })
    .setProps({minStep:100});
    service.getCharacteristic(Characteristic.TargetPosition).on('get', (callback) => {
      const value = this._SearchStatus(['sw']);
      if(value == 'open') {
        callback(null, 100);
      } else if((value == 'opening') || (value == 'closing')) {
        callback(null, 50);
      } else {
        callback(null, 0);
      }
    })
    .setProps({minStep:100});
    service.getCharacteristic(Characteristic.TargetPosition).on('set', (value, callback) => {
      if(this._Item.buttons != undefined) {
        const stat = this._SearchStatus(['sw']);
        if((value == 100) && (stat != 'open') && (stat != 'opening')) {
          if(this._Item.buttons[0] && this._Item.buttons[0].command) {
            this._SendCommand(this._Item.buttons[0].deviceName, this._Item.buttons[0].command);
          }
        } else if((value == 0) && (stat != 'close') && (stat != 'closing')) {
          if((this._Item.buttons[1] != undefined) && (this._Item.buttons[1].command)) {
            this._SendCommand(this._Item.buttons[1].deviceName, this._Item.buttons[1].command);
          }
        }
      }
      callback();
    });
    service.getCharacteristic(Characteristic.PositionState).on('get', (callback) => {
      const value = this._SearchStatus();
      if(value == 'opening') {
        callback(null, Characteristic.PositionState.INCREASING);
      } else if(value == 'closing') {
        callback(null, Characteristic.PositionState.DECREASING);
      } else {
        callback(null, Characteristic.PositionState.STOPPED);
      }
    });
    this._AddStatusChange(service, (service, stat) => {
      if(stat.valueName == 'open') {
        service.setCharacteristic(Characteristic.CurrentPosition, 100);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
      } else if(stat.valueName == 'opening') {
        service.setCharacteristic(Characteristic.CurrentPosition, 50);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.INCREASING);
      } else if(stat.valueName == 'closing') {
        service.setCharacteristic(Characteristic.CurrentPosition, 50);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.DECREASING);
      } else {
        service.setCharacteristic(Characteristic.CurrentPosition, 0);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
      }
    });
    return service;
  }

  _ServiceThermostat() {
    const service = new Service.Thermostat(this._Name);
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', (callback) => {
      const value = this._GetStatus(this._Item.table.deviceName, this._Item.table.prefix);
      const mode = value?value.replace(/[0-9]*$/, ''):null;
      let v = Characteristic.CurrentHeatingCoolingState.OFF;
      if(mode == 'heater') {
        v = Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if(mode == 'cooler') {
        v = Characteristic.CurrentHeatingCoolingState.COOL;
      }
      const value2 = this._SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!value2 || (value2 == 'off')) {
        v = Characteristic.CurrentHeatingCoolingState.OFF;
      } else if(!mode) {
        const currentTemp = parseFloat(this._SearchStatus('temp'));
        if(currentTemp < 25) {
          v = Characteristic.CurrentHeatingCoolingState.HEAT;
        } else {
          v = Characteristic.CurrentHeatingCoolingState.COOL;
        }
      }
      callback(null, v);
    });
    
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', (callback) => {
      const val = this._GetStatus(this._Item.table.deviceName, this._Item.table.prefix);
      const mode = val?val.replace(/[0-9]*$/, ''):null;
      let v = Characteristic.TargetHeatingCoolingState.OFF;
      if(mode == 'heater') {
        v = Characteristic.TargetHeatingCoolingState.HEAT;
      } else if(mode == 'cooler') {
        v = Characteristic.TargetHeatingCoolingState.COOL;
      }
      const value2 = this._SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!value2 || (value2 == 'off')) v = Characteristic.TargetHeatingCoolingState.OFF;
      callback(null, v);
    });
    
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('set', (value, callback) => {
      if(value == Characteristic.CurrentHeatingCoolingState.OFF) {
        this._SendCommand(this._Item.table.deviceName, this._Item.table.prefix + '_off');
      } else {
        const val = this._GetStatus(this._Item.table.deviceName, this._Item.table.prefix);
        let temp = val?val.replace(/^[^0-9]*/, ''):20;
        if(!parseInt(temp)) temp = 20;
        let mode = 'off';
        if(value == Characteristic.CurrentHeatingCoolingState.HEAT) mode = 'heater';
        if(value == Characteristic.CurrentHeatingCoolingState.COOL) mode = 'cooler';
        this._SendCommand(this._Item.table.deviceName, this._Item.table.prefix + '_' + mode + temp);
        if(mode != 'off') this._SetLastCommand(this._Item.table.deviceName, this._Item.table.prefix, mode+temp);
      }
      callback();
    });
    service.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
      const temp = parseFloat(this._SearchStatus('temp'));
      callback(null, temp);
    })
    .setProps({minValue:-40});
    service.getCharacteristic(Characteristic.TargetTemperature).on('get', (callback) => {
      const val = this._GetLastCommand(this._Item.table.deviceName, this._Item.table.prefix);
      let temp = parseFloat(val?val.replace(/^[^0-9]*/, ''):'20');
      if(!parseInt(temp)) temp = 20;
      callback(null, temp);
    })
    .setProps({minStep:1.0});
    service.getCharacteristic(Characteristic.TargetTemperature).on('set', (value, callback) => {
      const val = this._GetStatus(this._Item.table.deviceName, this._Item.table.prefix);
      let mode = val?val.replace(/[0-9]*$/, ''):null;
      if(!mode) {
        const currentTemp = parseFloat(this._SearchStatus('temp'));
        if(currentTemp < 25) {
          mode = 'heater';
        } else {
          mode = 'cooler';
        }
      }
      const temp = ('0' + Math.floor(value).toString()).slice(-2);
      this._SendCommand(this._Item.table.deviceName, this._Item.table.prefix + '_' + mode + temp);
      this._SetLastCommand(this._Item.table.deviceName, this._Item.table.prefix, mode+temp);
      callback();
    });
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('get', (callback) => {
      callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    });
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('set', (value, callback) => {
      callback();
    });
    this._AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentTemperature, parseFloat(stat.value));
    }, 'temp');
    return service;
  }

  _ServiceBatteryService() {
    const service = new Service.BatteryService(this._Name);
    service.getCharacteristic(Characteristic.BatteryLevel).on('get', (callback) => {
      const value = this._GetStatus(this._Item.deviceName, this._Item.func);
      callback(null, value);
    });
    service.getCharacteristic(Characteristic.ChargingState).on('get', (callback) => {
      callback(null, Characteristic.ChargingState.NOT_CHARGING);
    });
    service.getCharacteristic(Characteristic.StatusLowBattery).on('get', (callback) => {
      callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    });
    this._AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.BatteryLevel, (parseFloat(stat.value) - 12000) / 10);
    }, 'battery');
    return service;
  }
  
  _ServiceTemperatureSensor() {
    const service = new Service.TemperatureSensor(this._Name);
    service.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
      const value = parseFloat(this._GetStatus(this._Item.deviceName, this._Item.func));
      callback(null, value);
    })
    .setProps({minValue:-40});
    this._AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentTemperature, parseFloat(stat.value));
    }, 'temp');
    return service;
  }

  _ServiceHumiditySensor() {
    const service = new Service.HumiditySensor(this._Name);
    service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', (callback) => {
      const value = parseFloat(this._GetStatus(this._Item.deviceName, this._Item.func));
      callback(null, value);
    });
    this._AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentRelativeHumidity, parseFloat(stat.value));
    }, 'temp');
    return service;
  }
}

module.exports = HomeBridgeAccessory;
