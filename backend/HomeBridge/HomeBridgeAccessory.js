//
// HomeBridgeAccessory.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const uuid = require("hap-nodejs").uuid;
const Accessory = require("hap-nodejs").Accessory;
const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;

class HomeBridgeAccessory extends Accessory {

  constructor(common, api, item, statNo) {

    const name = (statNo && (item.status[statNo].sensor !== `${item.status[statNo].deviceName}:${item.status[statNo].func}`)) ? item.status[statNo].sensor : item.label;
    console.log('Initializing platform accessory %s...', name);
    const platform = common.systemConfig.platform;
    const id = uuid.generate(`${platform.name}:${item.room}:${name}`);
    super(name, id);

    this.common = common;
    this.uuid = id;
    this.Name = name;
    this.Item = item;
    this.StatusNo = statNo;
    this.AddStatusChangeEvent = api.AddStatusChangeEvent;
    this.RemoveStatusChangeEvent = api.RemoveStatusChangeEvent;
    this.HSVtoRGB = this.common.HSVtoRGB;
    this.RGBtoHSV = this.common.RGBtoHSV;

    this.on('identify', (paired, callback) => {
      console.log('%s : Identify requested!', this.Name);
      callback();
    });

    this.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, platform.manufacturer)
      .setCharacteristic(Characteristic.Model, platform.model)
      .setCharacteristic(Characteristic.SerialNumber, platform.serial);
  }

  removeAllListeners() {
    super.removeAllListeners();
    this.RemoveStatusChangeEvent(this.uuid);
  }
  
  SearchStatus(typeOrFunc) {
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      if(this.StatusNo !== null) {
        if((this.Item.status[this.StatusNo].type == t) || (this.Item.status[this.StatusNo].func == t)) return this.GetStatus(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func);
      } else {
        for(const s in this.Item.status) {
          if((this.Item.status[s].type == t) || (this.Item.status[s].func == t)) return this.GetStatus(this.Item.status[s].deviceName, this.Item.status[s].func);
        }
      }
    }
    return {};
  }

  AddStatusChange(service, typeOrFunc, callback) {
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      if(this.Item.table &&
        ((this.Item.table.prefix === t) ||
         (this.Item.table.func === t) ||
         (this.Item.table.type === t) ||
         ('switch' === t))) {
        this.AddStatusChangeEvent(this.Item.table.deviceName, t, this.uuid, service, callback);
      }
    }
    if(this.Item.status == undefined) return;
    for(const t of typeOrFunc) {
      if(this.StatusNo !== null) {
        if((this.Item.status[this.StatusNo].type == t) || (this.Item.status[this.StatusNo].func == t)) {
          this.AddStatusChangeEvent(this.Item.status[this.StatusNo].deviceName, this.Item.status[this.StatusNo].func, this.uuid, service, callback);
        }
      } else {
        for(const s in this.Item.status) {
          if((this.Item.status[s].type == t) || (this.Item.status[s].func == t)) {
            this.AddStatusChangeEvent(this.Item.status[s].deviceName, this.Item.status[s].func, this.uuid, service, callback);
          }
        }
      }
    }
  }

  SendCommand(deviceName, command) {
    console.log('_SendCommand : [%s] %s', deviceName, command);
    this.common.emit('sendControllerCommand', this, {deviceName: deviceName, command: command});
  }

  GetStatus(deviceName, func) {
    return this.common.status[`${deviceName}:${func}`] || {};
  }

  SetStatus(deviceName, func, param) {
    let device = deviceName;
    if(this.common.aliasTable && this.common.aliasTable[deviceName]) {
      device = this.common.aliasTable[deviceName].device;
    }
    this.common.status[`${deviceName}:${func}`] = {
      deviceName,
      device: device,
      func,
      funcName: func,
      value: param,
      valueName: param,
    };
    this.common.emit('statusNotify', this);
  }
}

module.exports = HomeBridgeAccessory;
