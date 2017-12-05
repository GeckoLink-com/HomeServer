//
// HomeBridgePlatform.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const init = require("hap-nodejs").init;
const uuid = require("hap-nodejs").uuid;
const Bridge = require("hap-nodejs").Bridge;
const HomeBridgeAccessory = require('./HomeBridgeAccessory');

class HomeBridgePlatform {

  constructor(common) {

    this._common = common;
    this._statusChangeEvents = {};
    this._status = [];
    this._published = false;
    this._Bridge = null;

    init(this._common.config.basePath + '/homeBridge');

    this._API = {
      SendCommand: this._SendCommand.bind(this),
      GetStatus: this._GetStatus.bind(this),
      GetUITable: this._GetUITable.bind(this),
      AddStatusChangeEvent: this._AddStatusChangeEvent.bind(this),
      RemoveStatusChangeEvent: this._RemoveStatusChangeEvent.bind(this),
      SetLastCommand: this._SetLastCommand.bind(this),
      GetLastCommand: this._GetLastCommand.bind(this),
    }; 

    this._common.on('changeUITable', this._UITableNotify.bind(this));
    this._common.on('changeRemocon', this._UITableNotify.bind(this));
    this._common.on('statusNotify', this._StatusNotify.bind(this));
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.on('changeSystemConfig', (_caller) => {
      if(!this._common.systemConfig) return;
      if(!this._common.systemConfig.platform) return;
      console.log("%s HomeBridge initialize", this._common.systemConfig.platform.name);
      if(this._Bridge && this._Bridge._server) {
        this._Bridge._server._httpServer._tcpServer.close(() => {
          this._Bridge = new Bridge(this._common.systemConfig.bridge.name, uuid.generate(this._common.systemConfig.bridge.name));
          this._published = false;
          this._UITableNotify();
        });
      } else {
        this._Bridge = new Bridge(this._common.systemConfig.bridge.name, uuid.generate(this._common.systemConfig.bridge.name));
        this._UITableNotify();
      }
    });
  }

  _SendCommand(deviceName, command) {
    console.log('_SendCommand : [%s] %s', deviceName, command);
    this._common.emit('sendControllerCommand', this, {deviceName: deviceName, command: command});
  }

  _GetStatus(deviceName, func) {
    let val = null;
    for(let st of this._common.status) {
      if((st.deviceName == deviceName) &&
         (st.func == func)) {
        return st.valueName;
      }
    }
    if(('lastCommand' in this._common.internalStatus) &&
       (deviceName in this._common.internalStatus.lastCommand) &&
       (func in this._common.internalStatus.lastCommand[deviceName])) {
      val = this._common.internalStatus.lastCommand[deviceName][func];
      return val;
    }
  }
  
  _GetUITable(table) {
    return this._UITable.TableList[table];
  }

  _StatusNotify(_caller) {
    for(let d of this._common.status) {
      if(this._statusChangeEvents[d.deviceName + ':' + d.func] != undefined) {
        this._statusChangeEvents[d.deviceName + ':' + d.func].forEach((event) => {
          event.callback(event.service, d);
        });
      }
    }
  }
  
  _AddStatusChangeEvent(deviceName, func, uuid, service, callback) {
    if(this._statusChangeEvents[deviceName + ':' + func] == undefined) this._statusChangeEvents[deviceName + ':' + func] = [];
    this._statusChangeEvents[deviceName + ':' + func].push({uuid: uuid, service:service, callback:callback});
  }

  _SetLastCommand(deviceName, func, mode) {
    if(!('lastCommand' in this._common.internalStatus)) this._common.internalStatus.lastCommand = {};
    if(!(deviceName in this._common.internalStatus.lastCommand)) this._common.internalStatus.lastCommand[deviceName] = {};
    this._common.internalStatus.lastCommand[deviceName][func] = mode;
    this._common.emit('changeInternalStatus', this);
  }

  _GetLastCommand(deviceName, func) {
    if(('lastCommand' in this._common.internalStatus) &&
       (deviceName in this._common.internalStatus.lastCommand) &&
       (func in this._common.internalStatus.lastCommand[deviceName])) {
      return this._common.internalStatus.lastCommand[deviceName][func];
    }
  }
  
  _RemoveStatusChangeEvent(uuid) {
    for(let name in this._statusChangeEvents) {
      for(let i in this._statusChangeEvents[name]) {
        if(this._statusChangeEvents[name][i].uuid == uuid) {
          this._statusChangeEvents[name].splice(i, i + 1);
        }
      }
    }
  }

  _UITableNotify(_caller) {
    if(!this._Bridge) return;
    if(!this._common.remocon.remoconGroup) return;
    if(!this._common.uiTable.ItemList) return;
    this._UITable = { RoomList:this._common.uiTable.RoomList, ItemList:this._common.uiTable.ItemList, TableList:this._common.remocon.remoconGroup, System:this._common.uiTable.System};
    this._Bridge.removeBridgedAccessories(this._Bridge.bridgedAccessories);
    this._Bridge.bridgedAccessories = [];
    for(let d of this._common.uiTable.ItemList) {
      if(['onOff', 'openClose', 'lock', 'window', 'brind', 'shutter', 'aircon', 'tv'].indexOf(d.type) >= 0) {
        if(d.label != undefined) this._AddAccessory(d, d.room, d.label);
      }
      if(d.type == 'tv') {
        if(d.table != undefined) {
          for(let band in this._UITable.TableList[d.table.prefix]) {
            if(!this._UITable.TableList[d.table.prefix][band].display) continue;
            for(let ch in this._UITable.TableList[d.table.prefix][band]) {
              if(!this._UITable.TableList[d.table.prefix][band][ch].display) continue;
              let item = {};
              item.type = 'tv';
              item.buttons = [{deviceName: d.table.deviceName, command:[d.table.prefix + '_' + band, d.table.prefix + '_' + ch]}, {deviceName: d.table.deviceName, command:[d.table.prefix + '_off']}];
              this._AddAccessory(item, d.room, this._UITable.TableList[d.table.prefix][band][ch].label);
            }
          }
        }
      }
      if(d.status != undefined) {
        for(let s of d.status) {
          if(['temp', 'humidity', 'battery'].indexOf(s.type) >= 0) {
            if(s.label != undefined) {
              this._AddAccessory(s, d.room, s.label);
            }
          }
        }
      }
    }
    if(!this._published) {
      console.log('HomeBridge publish');
      console.log('HomeBridge PIN-code : ', this._common.systemConfig.bridge.pin);
      console.log('HomeBridge setupURI : ', this._common.systemConfig.bridge.setupURI);
      const publishInfo = {
        username: this._common.systemConfig.bridge.username,
        port: this._common.systemConfig.bridge.port,
        pincode: this._common.systemConfig.bridge.pin,
        category: HomeBridgeAccessory.Categories.BRIDGE,
        setupID: this._common.systemConfig.bridge.setupID,
      };
      this._Bridge.publish(publishInfo, false);
      this._published = true;
    }
  }
  
  _AddAccessory(itemConfig, room, name) {

    const accessory = new HomeBridgeAccessory(room, name, itemConfig, this._common.systemConfig, this._API);
    try {
      this._Bridge.addBridgedAccessory(accessory);
    } catch(e) {
      console.log(e);
    }
  }
}

module.exports = HomeBridgePlatform;
