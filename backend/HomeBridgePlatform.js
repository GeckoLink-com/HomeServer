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

    this.common = common;
    this.statusChangeEvents = {};
    this.status = [];
    this.published = false;
    this.Bridge = null;

    init(this.common.config.basePath + '/homeBridge');

    this.API = {
      SendCommand: this.SendCommand.bind(this),
      GetStatus: this.GetStatus.bind(this),
      GetUITable: this.GetUITable.bind(this),
      AddStatusChangeEvent: this.AddStatusChangeEvent.bind(this),
      RemoveStatusChangeEvent: this.RemoveStatusChangeEvent.bind(this),
      SetLastCommand: this.SetLastCommand.bind(this),
      GetLastCommand: this.GetLastCommand.bind(this),
    }; 

    this.common.on('changeUITable', this.UITableNotify.bind(this));
    this.common.on('changeRemocon', this.UITableNotify.bind(this));
    this.common.on('statusNotify', this.StatusNotify.bind(this));
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.common.on('changeSystemConfig', (_caller) => {
      if(!this.common.systemConfig) return;
      if(!this.common.systemConfig.platform) return;
      if(!this.common.systemConfig.bridge) return;
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

  SendCommand(deviceName, command) {
    console.log('_SendCommand : [%s] %s', deviceName, command);
    this.common.emit('sendControllerCommand', this, {deviceName: deviceName, command: command});
  }

  GetStatus(deviceName, func) {
    let val = null;
    for(const st of this.common.status) {
      if((st.deviceName == deviceName) &&
         (st.func == func)) {
        return st.valueName;
      }
    }
    if(('lastCommand' in this.common.internalStatus) &&
       (deviceName in this.common.internalStatus.lastCommand) &&
       (func in this.common.internalStatus.lastCommand[deviceName])) {
      val = this.common.internalStatus.lastCommand[deviceName][func];
      return val;
    }
    return null;
  }
  
  GetUITable(table) {
    return this.UITable.TableList[table];
  }

  StatusNotify(_caller) {
    for(const d of this.common.status) {
      if(this.statusChangeEvents[d.deviceName + ':' + d.func] != undefined) {
        this.statusChangeEvents[d.deviceName + ':' + d.func].forEach((event) => {
          event.callback(event.service, d);
        });
      }
    }
  }
  
  AddStatusChangeEvent(deviceName, func, uuid, service, callback) {
    if(this.statusChangeEvents[deviceName + ':' + func] == undefined) this.statusChangeEvents[deviceName + ':' + func] = [];
    this.statusChangeEvents[deviceName + ':' + func].push({uuid: uuid, service:service, callback:callback});
  }

  SetLastCommand(deviceName, func, mode) {
    if(!('lastCommand' in this.common.internalStatus)) this.common.internalStatus.lastCommand = {};
    if(!(deviceName in this.common.internalStatus.lastCommand)) this.common.internalStatus.lastCommand[deviceName] = {};
    this.common.internalStatus.lastCommand[deviceName][func] = mode;
    this.common.emit('changeInternalStatus', this);
  }

  GetLastCommand(deviceName, func) {
    if(('lastCommand' in this.common.internalStatus) &&
       (deviceName in this.common.internalStatus.lastCommand) &&
       (func in this.common.internalStatus.lastCommand[deviceName])) {
      return this.common.internalStatus.lastCommand[deviceName][func];
    }
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
    this.UITable = { RoomList:this.common.uiTable.RoomList, ItemList:this.common.uiTable.ItemList, TableList:this.common.remocon.remoconGroup, System:this.common.uiTable.System};
    this.Bridge.removeBridgedAccessories(this.Bridge.bridgedAccessories);
    this.Bridge.bridgedAccessories = [];
    if(this.UITable.ItemList == null) this.UITable.ItemList = [];
    for(const d of this.UITable.ItemList) {
      if(['onOff', 'openClose', 'hue', 'light', 'lock', 'window', 'brind', 'shutter', 'aircon', 'tv'].indexOf(d.type) >= 0) {
        if(d.label != undefined) this.AddAccessory(d, d.room, d.label);
      }
      if(d.type == 'tv') {
        if((d.table != null) && (this.UITable.TableList != null)) {
          for(const band in this.UITable.TableList[d.table.prefix]) {
            if(!this.UITable.TableList[d.table.prefix][band].display) continue;
            for(const ch in this.UITable.TableList[d.table.prefix][band]) {
              if(!this.UITable.TableList[d.table.prefix][band][ch].display) continue;
              let item = {};
              item.type = 'tv';
              item.buttons = [{deviceName: d.table.deviceName, command:[d.table.prefix + '_' + band, d.table.prefix + '_' + ch]}, {deviceName: d.table.deviceName, command:[d.table.prefix + '_off']}];
              this.AddAccessory(item, d.room, this.UITable.TableList[d.table.prefix][band][ch].label);
            }
          }
        }
      }
      if(d.status != undefined) {
        for(const s of d.status) {
          if(['temp', 'humidity', 'battery'].indexOf(s.type) >= 0) {
            if(s.label != undefined) {
              this.AddAccessory(s, d.room, s.label);
            }
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
        category: HomeBridgeAccessory.Categories.BRIDGE,
        setupID: this.common.systemConfig.bridge.setupID,
      };
      this.Bridge.publish(publishInfo, false);
      this.published = true;
    }
  }
  
  AddAccessory(itemConfig, room, name) {

    const accessory = new HomeBridgeAccessory(room, name, itemConfig, this.common.systemConfig, this.API);
    try {
      this.Bridge.addBridgedAccessory(accessory);
    } catch(e) {
      console.log(e);
    }
  }
}

module.exports = HomeBridgePlatform;
