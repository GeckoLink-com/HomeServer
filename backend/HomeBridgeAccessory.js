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

    this.uuid = uuid.generate(config.platform.name + ':' + room + name);
    this.Name = name;
    this.Item = item;
    this.SendCommand = api.SendCommand;
    this.GetStatus = api.GetStatus;
    this.GetUITable = api.GetUITable;
    this.AddStatusChangeEvent = api.AddStatusChangeEvent;
    this.RemoveStatusChangeEvent = api.RemoveStatusChangeEvent;
    this.SetLastCommand = api.SetLastCommand;
    this.GetLastCommand = api.GetLastCommand;

    this.on('identify', (paired, callback) => {
      console.log('%s : Identify requested!', this.Name);
      callback();
    });
    
    this.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, config.platform.manufacturer)
      .setCharacteristic(Characteristic.Model, config.platform.model)
      .setCharacteristic(Characteristic.SerialNumber, config.platform.serial);
    
    let service = null;
    switch(this.Item.type) {
// control
      case 'onOff':
      case 'openClose':
      case 'status':
      case 'other':
      case 'tv':
      case 'hue':
      case 'light':
        service = this.ServiceSwitch();
        break;
      case 'lock':
        service = this.ServiceLockMechanism();
        break;
      case 'window':
      case 'shutter':
      case 'brind':
        service = this.ServiceWindow();
        break;
      case 'aircon':
        service = this.ServiceThermostat();
        break;
// sensor
      case 'battery':
        service = this.ServiceBatteryService();
        break;
      case 'temp':
        service = this.ServiceTemperatureSensor();
        break;
      case 'humidity':
        service = this.ServiceHumiditySensor();
        break;
      default:
        console.log('error : %s', this.Item.type);
        return;
    }
    this.addService(service);
  }

  removeAllListeners() {
    super.removeAllListeners();
    this.RemoveStatusChangeEvent(this.uuid);
  }
  
  SearchStatus(typeOrFunc) {
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      for(const s in this.Item.status) {
        if(this.Item.status[s].type == t) return this.GetStatus(this.Item.status[s].deviceName, this.Item.status[s].func);
        if(this.Item.status[s].func == t) return this.GetStatus(this.Item.status[s].deviceName, this.Item.status[s].func);
      }
    }
  }

  AddStatusChange(service, callback, typeOrFunc) {
    if(this.Item.status == undefined) return;
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      for(const s in this.Item.status) {
        if((this.Item.status[s].type == t) || (this.Item.status[s].func == t))
          this.AddStatusChangeEvent(this.Item.status[s].deviceName, this.Item.status[s].func, this.uuid, service, callback);
      }
    }
  }
  
  ServiceSwitch() {
    const service = new Service.Switch(this.Name);

    service.getCharacteristic(Characteristic.On).on('get', (callback) => {
      const value = this.SearchStatus(['ha0', 'ha1', 'sw', 'gpio0', 'gpio1', 'gpio', 'gpio3']);
      if(value == "on") {
        callback(null, true);
      } else if(value == "off"){
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
    
    this.AddStatusChange(service, (service, stat) => {
      if(stat.valueName == "on") {
        this.state = true;
        service.setCharacteristic(Characteristic.On, true);
      } else {
        this.state = false;
        service.setCharacteristic(Characteristic.On, false);
      }
    });
    return service;
  }
  
  ServiceLockMechanism() {
    const service = new Service.LockMechanism(this.Name);
    service.getCharacteristic(Characteristic.LockCurrentState).on('get', (callback) => {
      const value = this.SearchStatus(['ha0', 'ha1']);
      if(value == "close") {
        callback(null, Characteristic.LockCurrentState.SECURED);
      } else {
        callback(null, Characteristic.LockCurrentState.UNSECURED);
      }
    });
    service.getCharacteristic(Characteristic.LockTargetState).on('get', (callback) => {
      const value = this.SearchStatus(['ha0', 'ha1']);
      if(value == "close") {
        callback(null, Characteristic.LockTargetState.SECURED);
      } else {
        callback(null, Characteristic.LockTargetState.UNSECURED);
      }
    });
    service.getCharacteristic(Characteristic.LockTargetState).on('set', (value, callback) => {
      if(this.Item.buttons != undefined) {
        if(value == Characteristic.LockTargetState.UNSECURED) {
          if(this.Item.buttons[0] && this.Item.buttons[0].func) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].func + ' ' + this.Item.buttons[0].mode);
          } else if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
        } else {
          if(this.Item.buttons[1] && this.Item.buttons[1].func) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].func + ' ' + this.Item.buttons[1].mode);
          } else if(this.Item.buttons[1] && this.Item.buttons[1].command) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
          }
        }
      }
      callback();
    });
    this.AddStatusChange(service, (service, stat) => {
      if(stat.valueName == "close") {
        service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
      } else {
        service.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
      }
    });
    return service;
  }

  ServiceWindow() {
    let service;
    if(this.Item.type == 'window') service = new Service.Window(this.Name);
    if(this.Item.type == 'brind') service = new Service.WindowCovering(this.Name);
    if(this.Item.type == 'shutter') service = new Service.WindowCovering(this.Name);
    service.getCharacteristic(Characteristic.CurrentPosition).on('get', (callback) => {
      const value = this.SearchStatus(['sw']);
      if((value == 'open') || (value == 'opening')) {
        callback(null, 100);
      } else {
        callback(null, 0);
      }
    })
    .setProps({minStep:100});
    service.getCharacteristic(Characteristic.TargetPosition).on('get', (callback) => {
      const value = this.SearchStatus(['sw']);
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
      if(this.Item.buttons != undefined) {
        const stat = this.SearchStatus(['sw']);
        if((value == 100) && (stat != 'open') && (stat != 'opening')) {
          if(this.Item.buttons[0] && this.Item.buttons[0].command) {
            this.SendCommand(this.Item.buttons[0].deviceName, this.Item.buttons[0].command);
          }
        } else if((value == 0) && (stat != 'close') && (stat != 'closing')) {
          if((this.Item.buttons[1] != undefined) && (this.Item.buttons[1].command)) {
            this.SendCommand(this.Item.buttons[1].deviceName, this.Item.buttons[1].command);
          }
        }
      }
      callback();
    });
    service.getCharacteristic(Characteristic.PositionState).on('get', (callback) => {
      const value = this.SearchStatus();
      if(value == 'opening') {
        callback(null, Characteristic.PositionState.INCREASING);
      } else if(value == 'closing') {
        callback(null, Characteristic.PositionState.DECREASING);
      } else {
        callback(null, Characteristic.PositionState.STOPPED);
      }
    });
    this.AddStatusChange(service, (service, stat) => {
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

  ServiceThermostat() {
    const service = new Service.Thermostat(this.Name);
    service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', (callback) => {
      const value = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      const mode = value?value.replace(/[0-9]*$/, ''):null;
      let v = Characteristic.CurrentHeatingCoolingState.OFF;
      if(mode == 'heater') {
        v = Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if(mode == 'cooler') {
        v = Characteristic.CurrentHeatingCoolingState.COOL;
      }
      const value2 = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!value2 || (value2 == 'off')) {
        v = Characteristic.CurrentHeatingCoolingState.OFF;
      } else if(!mode) {
        const currentTemp = parseFloat(this.SearchStatus('temp'));
        if(currentTemp < 25) {
          v = Characteristic.CurrentHeatingCoolingState.HEAT;
        } else {
          v = Characteristic.CurrentHeatingCoolingState.COOL;
        }
      }
      callback(null, v);
    });
    
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', (callback) => {
      const val = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      const mode = val?val.replace(/[0-9]*$/, ''):null;
      let v = Characteristic.TargetHeatingCoolingState.OFF;
      if(mode == 'heater') {
        v = Characteristic.TargetHeatingCoolingState.HEAT;
      } else if(mode == 'cooler') {
        v = Characteristic.TargetHeatingCoolingState.COOL;
      }
      const value2 = this.SearchStatus(['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
      if(!value2 || (value2 == 'off')) v = Characteristic.TargetHeatingCoolingState.OFF;
      callback(null, v);
    });
    
    service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('set', (value, callback) => {
      if(value == Characteristic.CurrentHeatingCoolingState.OFF) {
        this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_off');
      } else {
        const val = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
        let temp = val?val.replace(/^[^0-9]*/, ''):20;
        if(!parseInt(temp)) temp = 20;
        let mode = 'off';
        if(value == Characteristic.CurrentHeatingCoolingState.HEAT) mode = 'heater';
        if(value == Characteristic.CurrentHeatingCoolingState.COOL) mode = 'cooler';
        this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_' + mode + temp);
        if(mode != 'off') this.SetLastCommand(this.Item.table.deviceName, this.Item.table.prefix, mode+temp);
      }
      callback();
    });
    service.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
      const temp = parseFloat(this.SearchStatus('temp'));
      callback(null, temp);
    })
    .setProps({minValue:-40});
    service.getCharacteristic(Characteristic.TargetTemperature).on('get', (callback) => {
      const val = this.GetLastCommand(this.Item.table.deviceName, this.Item.table.prefix);
      let temp = parseFloat(val?val.replace(/^[^0-9]*/, ''):'20');
      if(!parseInt(temp)) temp = 20;
      callback(null, temp);
    })
    .setProps({minStep:1.0});
    service.getCharacteristic(Characteristic.TargetTemperature).on('set', (value, callback) => {
      const val = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      let mode = val?val.replace(/[0-9]*$/, ''):null;
      if(!mode) {
        const currentTemp = parseFloat(this.SearchStatus('temp'));
        if(currentTemp < 25) {
          mode = 'heater';
        } else {
          mode = 'cooler';
        }
      }
      const temp = ('0' + Math.floor(value).toString()).slice(-2);
      this.SendCommand(this.Item.table.deviceName, this.Item.table.prefix + '_' + mode + temp);
      this.SetLastCommand(this.Item.table.deviceName, this.Item.table.prefix, mode+temp);
      callback();
    });
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('get', (callback) => {
      callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    });
    service.getCharacteristic(Characteristic.TemperatureDisplayUnits).on('set', (value, callback) => {
      callback();
    });
    this.AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentTemperature, parseFloat(stat.value));
    }, 'temp');
    return service;
  }

  ServiceBatteryService() {
    const service = new Service.BatteryService(this.Name);
    service.getCharacteristic(Characteristic.BatteryLevel).on('get', (callback) => {
      const value = this.GetStatus(this.Item.deviceName, this.Item.func);
      callback(null, value);
    });
    service.getCharacteristic(Characteristic.ChargingState).on('get', (callback) => {
      callback(null, Characteristic.ChargingState.NOT_CHARGING);
    });
    service.getCharacteristic(Characteristic.StatusLowBattery).on('get', (callback) => {
      callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    });
    this.AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.BatteryLevel, (parseFloat(stat.value) - 12000) / 10);
    }, 'battery');
    return service;
  }
  
  ServiceTemperatureSensor() {
    const service = new Service.TemperatureSensor(this.Name);
    service.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
      const value = parseFloat(this.GetStatus(this.Item.deviceName, this.Item.func));
      callback(null, value);
    })
    .setProps({minValue:-40});
    this.AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentTemperature, parseFloat(stat.value));
    }, 'temp');
    return service;
  }

  ServiceHumiditySensor() {
    const service = new Service.HumiditySensor(this.Name);
    service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', (callback) => {
      const value = parseFloat(this.GetStatus(this.Item.deviceName, this.Item.func));
      callback(null, value);
    });
    this.AddStatusChange(service, (service, stat) => {
      service.setCharacteristic(Characteristic.CurrentRelativeHumidity, parseFloat(stat.value));
    }, 'temp');
    return service;
  }
}

module.exports = HomeBridgeAccessory;
