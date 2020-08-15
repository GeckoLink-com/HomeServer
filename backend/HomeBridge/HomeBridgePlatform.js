//
// HomeBridgePlatform.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const init = require("hap-nodejs").init;
const uuid = require("hap-nodejs").uuid;
const Bridge = require("hap-nodejs").Bridge;
const Categories = require("hap-nodejs").Categories;

const HomeBridgeAccessorySwitch = require('./HomeBridgeAccessorySwitch');
const HomeBridgeAccessoryDimmerLight = require('./HomeBridgeAccessoryDimmerLight');
const HomeBridgeAccessoryColorLight = require('./HomeBridgeAccessoryColorLight');
const HomeBridgeAccessoryLockMechanism = require('./HomeBridgeAccessoryLockMechanism');
const HomeBridgeAccessoryWindow = require('./HomeBridgeAccessoryWindow');
const HomeBridgeAccessoryTelevision = require('./HomeBridgeAccessoryTelevision');
const HomeBridgeAccessoryThermostat = require('./HomeBridgeAccessoryThermostat');
const HomeBridgeAccessoryBatteryService = require('./HomeBridgeAccessoryBatteryService');
const HomeBridgeAccessoryTemperatureSensor = require('./HomeBridgeAccessoryTemperatureSensor');
const HomeBridgeAccessoryHumiditySensor = require('./HomeBridgeAccessoryHumiditySensor');
const HomeBridgeAccessoryMotionSensor = require('./HomeBridgeAccessoryMotionSensor');
const HomeBridgeAccessoryAirQualitySensor = require('./HomeBridgeAccessoryAirQualitySensor');
const HomeBridgeAccessoryRainSensor = require('./HomeBridgeAccessoryRainSensor');
const HomeBridgeAccessoryNoiseSensor = require('./HomeBridgeAccessoryNoiseSensor');
const HomeBridgeAccessoryLightSensor = require('./HomeBridgeAccessoryLightSensor');
const HomeBridgeAccessoryEnergy = require('./HomeBridgeAccessoryEnergy');

class HomeBridgePlatform {

  constructor(common) {

    this.common = common;
    this.statusChangeEvents = {};
    this.status = [];
    this.published = false;
    this.Bridge = null;

    this.API = {
      AddStatusChangeEvent: this.AddStatusChangeEvent.bind(this),
      RemoveStatusChangeEvent: this.RemoveStatusChangeEvent.bind(this),
    };

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.common.on('initializeAfterSetUID', (_caller) => {
      init(this.common.config.basePath + '/homeBridge');
    });
    this.common.on('changeUITable', this.UITableNotify.bind(this));
    this.common.on('changeRemocon', this.UITableNotify.bind(this));
    this.common.on('changeStatus', this.StatusNotify.bind(this));
    this.common.on('statusNotify', this.StatusNotify.bind(this));
    this.common.on('changeSystemConfig', (_caller) => {
      if(!this.common.systemConfig) return;
      if(!this.common.systemConfig.platform) return;
      if(!this.common.systemConfig.bridge) return;
      if(!this.common.systemConfig.bridge.name) return;
      if(!this.common.systemConfig.bridge.changeState) return;

      console.log("%s HomeBridge initialize", this.common.systemConfig.platform.name);
      if(this.Bridge && this.Bridge._server) {
        this.Bridge._server._httpServer._tcpServer.close(() => {
          this.Bridge = new Bridge(this.common.systemConfig.bridge.name, uuid.generate(this.common.systemConfig.bridge.name));
          this.published = false;
          this.UITableNotify();
        });
      } else {
        this.Bridge = new Bridge(this.common.systemConfig.bridge.name, uuid.generate(this.common.systemConfig.bridge.name));
        this.UITableNotify();
      }
      this.common.systemConfig.bridge.changeState = false;
    });
  }

  StatusNotify(_caller, msg) {

    if(msg == null) {
      for(const i in this.common.status) {
        const d = this.common.status[i];
        if(this.statusChangeEvents[`${d.deviceName}:${d.func}`]) {
          this.statusChangeEvents[`${d.deviceName}:${d.func}`].forEach((event) => {
            event.callback(event.service, d);
          });
        }
      }
    } else {
      for(const i in msg.data) {
        const d = msg.data[i];
        if(this.statusChangeEvents[`${d.deviceName}:${d.func}`]) {
          this.statusChangeEvents[`${d.deviceName}:${d.func}`].forEach((event) => {
            event.callback(event.service, d);
          });
        }
      }
    }
  }

  AddStatusChangeEvent(deviceName, func, uuid, service, callback) {
    if(this.statusChangeEvents[deviceName + ':' + func] == undefined) this.statusChangeEvents[deviceName + ':' + func] = [];
    this.statusChangeEvents[deviceName + ':' + func].push({uuid, service, callback});
  }

  RemoveStatusChangeEvent(uuid) {
    for(const name in this.statusChangeEvents) {
      for(const i in this.statusChangeEvents[name]) {
        if(this.statusChangeEvents[name][i].uuid == uuid) {
          this.statusChangeEvents[name].splice(i, i + 1);
        }
      }
    }
  }

  UITableNotify(_caller) {
    if(!this.Bridge) return;
    if(!this.common.uiTable || (Object.keys(this.common.uiTable) === 0)) return;
    if(!this.common.remocon) return;
    this.Bridge.removeBridgedAccessories(this.Bridge.bridgedAccessories);
    this.Bridge.bridgedAccessories = [];
    for(const d of this.common.uiTable.ItemList) {
      if(['onOff', 'openClose', 'light', 'hue', 'dimmerLight', 'colorLight', 'lock', 'window', 'blind', 'shutter', 'aircon', 'tv'].indexOf(d.type) >= 0) {
        if(d.label) this.AddAccessory(d, null, d.type);
      }
      if(d.status) {
        if(d.type === 'aircon') continue;
        for(const s in d.status) {
          if(['temp', 'humidity', 'motion', 'battery', 'rain', 'noise', 'energy', 'airQuality'].indexOf(d.status[s].type) >= 0) {
            if(d.status[s].sensor) this.AddAccessory(d, s, d.status[s].type);
          }
        }
      }
    }
    if(!this.published) {
      console.log('HomeBridge publish');
      console.log('HomeBridge PIN-code : ', this.common.systemConfig.bridge.pin);
      console.log('HomeBridge setupURI : ', this.common.systemConfig.bridge.setupURI);
      const publishInfo = {
        username: this.common.systemConfig.bridge.username,
        port: this.common.systemConfig.bridge.port,
        pincode: this.common.systemConfig.bridge.pin,
        category: Categories.BRIDGE,
        setupID: this.common.systemConfig.bridge.setupID,
      };
      this.Bridge.publish(publishInfo, false);
      this.published = true;
    }
  }
  
  AddAccessory(item, statusNo, type) {
    let service = null;
    switch(type) {
// control
      case 'onOff':
      case 'openClose':
      case 'status':
      case 'other':
      case 'light':
        service = HomeBridgeAccessorySwitch;
        break;
      case 'hue':
      case 'dimmerLight':
        service = HomeBridgeAccessoryDimmerLight;
        break;
      case 'colorLight':
        service = HomeBridgeAccessoryColorLight;
        break;
      case 'lock':
        service = HomeBridgeAccessoryLockMechanism;
        break;
      case 'window':
      case 'shutter':
      case 'blind':
        service = HomeBridgeAccessoryWindow;
        break;
      case 'tv':
        service = HomeBridgeAccessoryTelevision;
        break;
      case 'aircon':
        service = HomeBridgeAccessoryThermostat;
        break;
// sensor
      case 'battery':
        service = HomeBridgeAccessoryBatteryService;
        break;
      case 'temp':
        service = HomeBridgeAccessoryTemperatureSensor;
        break;
      case 'humidity':
        service = HomeBridgeAccessoryHumiditySensor;
        break;
      case 'motion':
        service = HomeBridgeAccessoryMotionSensor;
        break;
      case 'rain':
        service = HomeBridgeAccessoryRainSensor;
        break;
      case 'noise':
        service = HomeBridgeAccessoryNoiseSensor;
        break;
      case 'energy':
        service = HomeBridgeAccessoryEnergy;
        break;
      case 'illuminance':
        service = HomeBridgeAccessoryLightSensor;
        break;
      case 'airQuality':
      service = HomeBridgeAccessoryAirQualitySensor;
      break;
      default:
        console.log('error : %s', type);
        return;
    }
    try {
      const accessory = new service(this.common, this.API, item, statusNo);
      this.Bridge.addBridgedAccessory(accessory);
    } catch(e) {
      console.log(e);
    }
  }
}

module.exports = HomeBridgePlatform;
