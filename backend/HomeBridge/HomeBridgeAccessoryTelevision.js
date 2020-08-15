//
// HomeBridgeAccessoryTelevision.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const Service = require("hap-nodejs").Service;
const Characteristic = require("hap-nodejs").Characteristic;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');
const Categories = require("hap-nodejs").Categories;

class HomeBridgeAccessoryTelevision extends HomeBridgeAccessory {

  constructor(common, api, item, statNo) {

    super(common, api, item, statNo);

    this.category = Categories.TELEVISION;
    const televisionService = this.addService(Service.Television, this.Name, this.Name);
    
    televisionService.setCharacteristic(Characteristic.ConfiguredName, this.Name);
    televisionService.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    this.state = false;
    televisionService.getCharacteristic(Characteristic.Active).on('get', (callback) => {
      const stat = this.GetStatus(this.Item.table.deviceName, this.Item.table.prefix);
      if(stat && (stat.value !== "off")) {
        callback(null, true);
      } else if(stat && (stat.value === "off")) {
        callback(null, false);
      } else if(this.state) {
        callback(null, this.state);
      } else {
        callback(null, false);
      }
    });
    televisionService.getCharacteristic(Characteristic.Active).on('set', (value, callback) => {
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

    televisionService.getCharacteristic(Characteristic.ActiveIdentifier).on('set', (value, callback) => {
      this.SendCommand(this.activeIdTable[value].deviceName, this.activeIdTable[value].command);
      callback();
    });

    televisionService.getCharacteristic(Characteristic.RemoteKey).on('set', (value, callback) => {
      console.log('set Remote Key => setNewValue: ', value);
      callback();
    });

    televisionService.getCharacteristic(Characteristic.PictureMode).on('set', (value, callback) => {
      console.log("set PictureMode => setNewValue: " + value);
      callback();
    });

    televisionService.getCharacteristic(Characteristic.PowerModeSelection).on('set', (value, callback) => {
      console.log("set PowerModeSelection => setNewValue: ", value);
      callback();
    });

    const speakerService = this.addService(Service.TelevisionSpeaker, this.Name + ' Volume', 'tvSpeakerService');

    speakerService.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE);
    speakerService.setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.RELATIVE);

    speakerService.getCharacteristic(Characteristic.VolumeSelector).on('set', (value, callback) => {
      console.log("set VolumeSelector => setNewValue: " ,value);
      callback();
    });

    speakerService.getCharacteristic(Characteristic.Volume).on('set', (value, callback) => {
      console.log("set Volume => setNewValue: " ,value);
      callback();
    });

    if(!this.common.remocon || !this.common.remocon.remoconGroup) return;
    const remoconTable = this.common.remocon.remoconGroup[this.Item.table.prefix];
    if(!remoconTable) return;
    let id = 1;
    this.activeIdTable = {};
    for(const net in remoconTable) {
      if((net === 'type') || (net === 'comment')) continue;
      if(!remoconTable[net].display) continue;
      for(const ch in remoconTable[net]) {
        if(!remoconTable[net][ch].display) continue;
        const source = this.addService(Service.InputSource, net+ch, remoconTable[net][ch].label);
        source.setCharacteristic(Characteristic.Identifier, id);
        source.setCharacteristic(Characteristic.ConfiguredName, remoconTable[net][ch].label);
        source.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED);
        source.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.TUNER);
        televisionService.addLinkedService(source);
        this.activeIdTable[id] = {
          net: net,
          ch: ch,
          label: remoconTable[net][ch].label,
          deviceName: this.Item.table.deviceName,
          command : [ `${this.Item.table.prefix}_${net}`, `${this.Item.table.prefix}_${ch}` ],
        };
        id++;
      }
    }
    televisionService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(1);

    let func = null;
    if(this.Item.status) func = this.Item.status[0].func;
    this.AddStatusChange(televisionService, func, (service, stat) => {
      if(stat.valueName === 'on') {
        this.state = true;
        service.getCharacteristic(Characteristic.Active).updateValue(true);
      } else {
        this.state = false;
        service.getCharacteristic(Characteristic.Active).updateValue(false);
      }
    });
  }
}

module.exports = HomeBridgeAccessoryTelevision;
