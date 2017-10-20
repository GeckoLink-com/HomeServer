/*

  frontend/js/common.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import SocketClient from 'socket.io-client';
import Toastr from './toastr';

class Common {
  constructor() {
    global.socket = SocketClient();
    global.toastr = new Toastr();

    this.eventToBackend = {
      command: 'command',
      alias: 'alias',
      remocon: 'remocon',
      addRemocon: 'addRemocon',
      uiTable: 'uiTable',
      initConfig: 'initConfig',
      setConfig: 'setConfig',
      setAuth: 'setAuth',
      systemConfig: 'systemConfig',
    };

    this.eventFromBackend = {
      deviceInfo: 'deviceInfo',
      status: 'status',
      events: 'events',
      queueInfo: 'queueInfo',
      response: 'response',
      alias: 'alias',
      remocon: 'remocon',
      uiTable: 'uiTable',
      systemConfig: 'systemConfig',
      controllerLog: 'controllerLog',
      hueBridges: 'hueBridges',
    };

    this.events = {
      changeDevices: 'changeDevices',
      changeAlias: 'changeAlias',
      changeRemocon: 'changeRemocon',
      changeUITable: 'changeUITable',
      changeHueBridges: 'changeHueBridges',
      changeSystemConfig: 'changeSystemConfig',
      changeTab: 'changeTab',
    };

    this.devices = [];
    this.hueBridges = [];
    this.deviceTable = {};
    this.alias = {};
    this.aliasTable = {};
    this.systemConfig = null;
    this.remocon = { remoconTable: {}, remoconGroup: {}, remoconMacro: {}};
    /*
      this.remocon = {
        remoconTable: {
          <remoconLabel>: {
            code: [ <byte>,<byte>,<byte>...],
            comment: <string>,
            group: <string>
          },
          :
        },
        remoconGroup: {
          <groupLabel>: {
            type: "aircon",
            comment: <string>,
            cooler:{
              color: <color>,
              min: <tempMin>,
              max: <tempMax>
            },
            heater:{
              color: <color>,
              min: <tempMin>,
              max: <tempMax>
            },
            :
          },
          :
          :
          :
          <groupLabel>: {
            type: "tv",
            comment: <string>,
            UHF:{
              display: <bool>,
              1: { display: <bool>, label: <string>},
              2: { display: <bool>, label: <string>},
              :
              :
              12: { display: <bool>, label: <string>},
            },
            BS:{
              display: <bool>,
              1: { display: <bool>, label: <string>},
              2: { display: <bool>, label: <string>},
              :
              :
              12: { display: <bool>, label: <string>},
            },
            CS:{
              display: <bool>,
              1: { display: <bool>, label: <string>},
              2: { display: <bool>, label: <string>},
              :
              :
              12: { display: <bool>, label: <string>},
            }
          },
          
        },
        remoconMacro: {
          <macroLabel>: {
            comment: <string>,
            macro: [
              { label: <string>, code: [<code> ....], wait: <number> },
                :
                :
            ],
          }
        }
      }
    */
    this.uiTable = {};
    this._handlers = {};
    this._Ahead(this.events.changeDevices, this._ChangeDevices.bind(this));
    this._Ahead(this.events.changeAlias, this._ChangeAlias.bind(this));
    this._Ahead(this.events.changeRemocon, this._ChangeRemocon.bind(this));
    this._Ahead(this.events.changeHueBridges, this._ChangeHueBridges.bind(this));
    this._Ahead(this.events.changeUITable, this._ChangeUITable.bind(this));
  }

  _Ahead(event, handler) {
    (this._handlers[event] || (this._handlers[event] = { ahead: null, on: [] })).ahead = handler;
  }

  On(event, handler, caller) {
    if(!event) console.log('Error event == null', caller);
    if(!this._handlers[event]) this._handlers[event] = { ahead: null, on: [] };
    let flag = true;
    for(const i in this._handlers[event].on) {
      if(this._handlers[event].on[i].handler === handler) flag = false;
    }
    if(flag) this._handlers[event].on.push({ handler: handler, caller: caller });
  }

  Trigger(event, caller) {
    if(!event) console.log('Error event == null', caller);
    if(event in this._handlers) {
      if(this._handlers[event].ahead) this._handlers[event].ahead();
      this._handlers[event].on.forEach(function(h) {
        if(h.caller !== caller) h.handler(caller);
      }, this);
    }
  }

  _ChangeDevices() {
    for(const i in this.devices) {
      if(this.devices[i].device === 'pairing') continue;
      this.deviceTable[this.devices[i].device] = this.devices[i];
    }
  }

  _ChangeHueBridges() {
    if(!this.hueBridges) return;
    this.hueLights = [];
    for(let i = 0; i < this.hueBridges.length; i++) {
      const bridge = this.hueBridges[i];
      for(const idx in bridge.lights) {
        this.hueLights.push({
          device: 'Hue_' + bridge.id + '_' + idx,
          bridge: bridge.id,
          idx: idx,
          name: bridge.lights[idx].name,
        });
      }
    }
  }

  _ChangeAlias() {
    this.aliasTable = {};
    for(const i in this.alias) {
      this.aliasTable[this.alias[i].name] = { device: i, func: 'name', property: this.alias[i] };
      for(const j in this.alias[i]) {
        this.aliasTable[this.alias[i][j].name] = { device: i, deviceName: this.alias[i].name, func: j, property: this.alias[i][j] };
      }
    }
  }

  RemoconSearch(code) {
    let offset = 0;
    let length = 0;
    if(!code || (parseInt(code[0]) !== 0) || (parseInt(code[1]) !== code.length) || !parseInt(code[2])) return {};
    if(parseInt(code[2]) < 4) {
      offset = 4;
      length = code[1] - 4;
    } else if(parseInt(code[2]) === 0xff) {
      offset = 5;
      length = code[3];
    } else {
      return {};
    }

    const data = {};
    for(const name in this.remocon.remoconTable) {
      const tcode = this.remocon.remoconTable[name].code;
      if(!tcode) break;
      let f = true;
      for(let i = offset; i < offset + length; i++) {
        if(code[i] !== tcode[i]) {
          f = false;
          break;
        }
      }
      if(f) {
        data.name = name;
        data.comment = this.remocon.remoconTable[name].comment;
        break;
      }
    }
    let str = '';
    for(let i = offset; i < offset + length; i++) {
      str += ('0' + code[i].toString(16)).slice(-2) + ' ';
    }
    data.code = str;
    return data;
  }

  _ChangeRemocon() {
    if(!this.remocon.remoconTable) this.remocon.remoconTable = {};
    if(!this.remocon.remoconGroup) this.remocon.remoconGroup = {};
  }

  _ChangeUITable() {
    if(!this.uiTable.RoomList) this.uiTable.RoomList = [];
    if(!this.uiTable.ItemList) this.uiTable.ItemList = [];
    if(this.uiTable.RoomList.length === 0) this.uiTable.RoomList.push('ホーム');
  }
}

export default Common;
