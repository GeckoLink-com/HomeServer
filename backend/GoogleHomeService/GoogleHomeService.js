//
// GoogleHomeService.js
//
// Copyright (C) 2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const { v4: uuid } = require('uuid');
const util = require('util');

const ServiceDimmerLight = require('./GoogleHomeServiceDimmerLight.js');
const ServiceColorLight = require('./GoogleHomeServiceColorLight.js');
const ServiceSwitch = require('./GoogleHomeServiceSwitch.js');
const ServiceThermostat = require('./GoogleHomeServiceThermostat.js');
const ServiceLock = require('./GoogleHomeServiceLock.js');
const ServiceWindow = require('./GoogleHomeServiceWindow.js');
const ServiceTelevision = require('./GoogleHomeServiceTelevision.js');
const ServiceTemperature = require('./GoogleHomeServiceTemperature.js');
const ServiceHumidity = require('./GoogleHomeServiceHumidity.js');

class GoogleHomeService {

  constructor(common) {

    this.common = common;

    this.api = {
      GetStatus: this.GetStatus.bind(this),
      SearchStatus: this.SearchStatus.bind(this),
      ExecCommand: this.ExecCommand.bind(this),
    };

    const serviceSwitch = new ServiceSwitch(this.common, this.api);
    const serviceWindow = new ServiceWindow(this.common, this.api);
    this.services = {
      // items
      onOff: serviceSwitch,
      other: serviceSwitch,
      light: serviceSwitch,
      dimmerLight: new ServiceDimmerLight(this.common, this.api),
      colorLight: new ServiceColorLight(this.common, this.api),
      aircon: new ServiceThermostat(this.common, this.api),
      lock: new ServiceLock(this.common, this.api),
      window: serviceWindow,
      blind: serviceWindow,
      shutter: serviceWindow,
      tv: new ServiceTelevision(this.common, this.api),
      // sensors
      temp: new ServiceTemperature(this.common, this.api),
      humidity: new ServiceHumidity(this.common, this.api),
      /*
      battery: serviceSensor,
      rain: serviceSensor,
      energy: serviceSensor,
      motion: serviceSensor,
      noise: serviceSensor,
      */
    };

    this.statusChangeEvents = {};
    this.localExecuteId = {};

    this.common.on('googleSmarthomeSync', this.Sync.bind(this));
    this.common.on('googleSmarthomeQuery', this.Query.bind(this));
    this.common.on('googleSmarthomeExecute', this.Execute.bind(this));
    this.common.on('googleSmarthomeLocalDevices', this.DeviceVerification.bind(this));
    this.common.on('googleSmarthomeLocalExecute', this.LocalExecute.bind(this));
    this.common.on('changeStatus', this.StatusNotify.bind(this));
  }

  Sync(_caller, msg) {

    const devices = [];
    // items
    for(const item of this.common.uiTable.ItemList) {
      const serviceData = this.services[item.type] && this.services[item.type].IntentSync(item, this.common.remocon.remoconGroup);
      if(!serviceData && item.buttons.length) console.log('=====> Not support device', item.type, item.room, item.label);
      if(!serviceData) continue;
      const nickNames = (item.alias || '').split(',');
      if(nickNames[0] === '') nickNames.shift();
      const id = uuid();
      serviceData.customData.deviceId = item.id;
      devices.push({
        id,
        type: serviceData.type,
        traits: serviceData.traits,
        name: {
          defaultNames: [ item.label, ],
          name: item.label,
          nicknames: nickNames,
        },
        willReportState: (serviceData.reportStatus.length > 0),
        attributes: serviceData.attributes,
        roomHint: item.room,
        customData: serviceData.customData,
        otherDeviceIds: [{ deviceId: item.id }],
      });
      if(serviceData.reportStatus) {
        for(const report of serviceData.reportStatus) {
          if(report) this.AddStatusChangeEvent(report.deviceName, report.func, serviceData.customData, id);
        }
      }
    }
    // sensors
    for(const item of this.common.uiTable.ItemList) {
      if((item.type === 'aircon') || !item.status) continue;
      for(const sensor of item.status) {
        if(!sensor.sensor) continue;
        if([undefined, null, 'other', 'led', 'hue', 'pwm'].indexOf(sensor.type) >= 0) continue;
        const name = (sensor.sensor !== `${sensor.deviceName}:${sensor.func}`) ? sensor.sensor : item.label;
        const serviceData = this.services[sensor.type] && this.services[sensor.type].IntentSync(sensor);
        if(!serviceData) {
          console.log('=====> Not support sensor', sensor.type, item.room, name);
          continue;
        }
        const nickNames = [ name ];
        if(name != item.label) nickNames.push(item.label);
        const id = uuid();
        serviceData.customData.deviceId = sensor.id;
        devices.push({
          id,
          type: serviceData.type,
          traits: serviceData.traits,
          name: {
            defaultNames: [ name, ],
            name: name,
            nicknames: nickNames,
          },
          willReportState: (serviceData.reportStatus.length > 0),
          attributes: serviceData.attributes,
          roomHint: item.room,
          customData: serviceData.customData,
          otherDeviceIds: [{ deviceId: sensor.id }],
        });
        if(serviceData.reportStatus) {
          for(const report of serviceData.reportStatus) {
            this.AddStatusChangeEvent(report.deviceName, report.func, serviceData.customData, id);
          }
        }
      }
    }
    this.common.emit('response', this, {
      type: 'responseWoLogging',
      data: [{
        type: 'googleSmarthomeSync',
        origin: msg,
        devices,
      }],
    });
  }

  async Query(_caller, msg) {

    const query = {};
    for(const device of msg.devices) {
      query[device.id] = await this.services[device.customData.type].IntentQuery(device.customData);
    }
    this.common.emit('response', this, {
      type: 'responseWoLogging',
      data: [{
        type: 'googleSmarthomeQuery',
        origin: msg,
        query,
      }],
    });
  }

  async Execute(_caller, msg) {

    console.log('CloudExecute : ',
      util.inspect(msg.execution, {colors:true, depth: null}),
      util.inspect(msg.devices, {colors:true, depth: null}));
    const statuses = {};
    if(this.localExecuteId[msg.requestId]) {
      clearTimeout(this.localExecuteId[msg.requestId].timer);
      delete this.localExecuteId[msg.requestId].timer;
      console.log('LocalExecute Timeout');
      const result = this.localExecuteId[msg.requestId];
      Object.assign(statuses, result);
      delete this.localExecuteId[msg.requestId];
    } else {
      const allResults = await Promise.all(msg.devices.map(device =>
        this.services[device.customData.type].IntentExec(device.customData, device.id, msg.execution)));
      allResults.map((result) => {
        if(!statuses[result.status]) statuses[result.status] = { ids: [], status: result.status, states: {}};
        statuses[result.status].ids.push(result.deviceId);
        Object.assign(statuses[result.status].states, result.states);
      });
    }
    const res =  {
      type: 'responseWoLogging',
      data: [{
        type: 'googleSmarthomeExecute',
        origin: msg,
        statuses: Object.keys(statuses).map(key => statuses[key]),
      }],
    };
    this.common.emit('response', this, res);
    console.log('CloudExecute Res : ', util.inspect(res.data[0].statuses, {colors:true, depth: null}));
  }

  DeviceVerification(callback) {
    // items
    const verificationDevices = [];
    for(const item of this.common.uiTable.ItemList) {
      const serviceData = this.services[item.type] && this.services[item.type].IntentSync(item, this.common.remocon.remoconGroup);
      if(!serviceData) continue;
      verificationDevices.push({ verificationId: item.id });
    }

    // sensors
    for(const item of this.common.uiTable.ItemList) {
      if((item.type === 'aircon') || !item.status) continue;
      for(const sensor of item.status) {
        if(!sensor.sensor) continue;
        if([undefined, null, 'other', 'led', 'hue', 'pwm'].indexOf(sensor.type) >= 0) continue;
        const serviceData = this.services[sensor.type] && this.services[sensor.type].IntentSync(sensor);
        if(!serviceData) continue;
        verificationDevices.push({ verificationId: sensor.id });
      }
    }
    callback(verificationDevices);
  }

  async LocalExecute(body, callback) {

    console.log('LocalExecute : ', body);
    const customData = body.customData;
    const execution = body.execution;
    const deviceId = body.deviceId;
    const result = await this.services[customData.type].IntentExec(customData, deviceId, execution);
    callback(result);
    console.log('LocalExecute Res : ', result);
    if(!this.localExecuteId[body.requestId]) this.localExecuteId[body.requestId] = {};
    if(!this.localExecuteId[body.requestId][result.status])
      this.localExecuteId[body.requestId][result.status] = { ids: [], status: result.status, states: {}};
    this.localExecuteId[body.requestId][result.status].ids.push(result.deviceId);
    Object.assign(this.localExecuteId[body.requestId][result.status].states, result.states);
    if(this.localExecuteId[body.requestId].timer) clearTimeout(this.localExecuteId[body.requestId].timer);
    this.localExecuteId[body.requestId].timer = setTimeout((id) => {
      delete this.localExecuteId[id];
    }, 5000, body.requestId);
  }

  ExecCommand(deviceName, command, deviceId, states) {
    console.log('Execute ', deviceName, command, deviceId, states);
    this.common.emit('sendControllerCommand', this, { deviceName, command, deviceId, states, timeStamp: new Date() });
    states.online = true;
    return { deviceId, states, status: 'SUCCESS' };
  }

  SearchStatus(item, typeOrFunc) {
    if(!item.status) return null;
    if(!Array.isArray(typeOrFunc)) typeOrFunc = [typeOrFunc];
    for(const t of typeOrFunc) {
      for(const sensor of item.status) {
        if((sensor.type == t) || (sensor.func == t)) return { deviceName: sensor.deviceName, func: sensor.func };
      }
    }
    return null;
  }

  GetStatus(arg1, func) {
    if(arg1 === null) return {};
    if(typeof(arg1) === 'object') return this.common.status[`${arg1.deviceName}:${arg1.func}`] || {};
    return this.common.status[`${arg1}:${func}`] || {};
  }

  AddStatusChangeEvent(deviceName, func, customData, deviceId) {
    this.statusChangeEvents[`${deviceName}:${func}`] = { customData, deviceId };
  }

  async StatusNotify(_caller, msg) {
    const query = {};
    for(const data of msg.data) {
      const i = `${data.deviceName}:${data.func}`;
      if(this.statusChangeEvents[i]) {
        const customData = this.statusChangeEvents[i].customData;
        const deviceId = this.statusChangeEvents[i].deviceId;
        query[deviceId] = await this.services[customData.type].IntentQuery(customData);
        if(query[deviceId] == null) continue;
        if(query[deviceId].color && query[deviceId].color.spectrumRgb) {
          query[deviceId].color.spectrumRGB = query[deviceId].color.spectrumRgb;
          delete query[deviceId].color.spectrumRgb;
        }
        if(query[deviceId].status) delete query[deviceId].status;
      }
    }
    if(Object.keys(query).length === 0) return;
    console.log('ReportState ', query);
    this.common.emit('googleSmartHomeReportState', this, { type: 'googleSmartHomeReportState', data: query });
  }
}

module.exports = GoogleHomeService;
