/*

  frontend/js/Common.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import { EventEmitter } from 'events';

class Common extends EventEmitter {
  constructor() {
    super();
    // this.setMaxListeners(100);

    this.devices = [];
    this.hueBridges = [];
    this.hueLights = [];
    this.deviceTable = {};
    this.alias = {};
    this.systemConfig = null;
    this.remocon = {
      remoconTable: {},
      remoconGroup: {},
      remoconMacro: {},
    };
    this.smartMeter = false;
    this.uiTable = {
      RoomList: [
        'ホーム',
      ],
      ItemList: [],
    };
    this._handlers = {};
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

    Socket.on('deviceInfo', (msg) => {
      this.devices = msg.data;
      this.emit('changeDevices', this);
    });

    Socket.on('alias', (msg) => {
      this.alias = msg;
      this.emit('changeAlias', this);
    });

    Socket.on('remocon', (msg) => {
      this.remocon = msg;
      if(!this.remocon.remoconTable) this.remocon.remoconTable = {};
      if(!this.remocon.remoconGroup) this.remocon.remoconGroup = {};
      if(!this.remocon.remoconMacro) this.remocon.remoconMacro = {};
      this.emit('changeRemocon', this);
    });

    Socket.on('hueBridges', (data) => {
      this.hueBridges = data;
      this.hueLights = [];
      if(this.hueBridges) {
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
      this.emit('changeHueBridges', this);
    });

    Socket.on('smartMeter', (data) => {
      this.smartMeter = data;
      this.emit('changeSmartMeter', this);
    });

    Socket.on('uiTable', (msg) => {
      this.uiTable = msg;
      if(!this.uiTable.RoomList) this.uiTable.RoomList = [];
      if(!this.uiTable.ItemList) this.uiTable.ItemList = [];
      if(this.uiTable.RoomList.length === 0) this.uiTable.RoomList.push('ホーム');
      this.emit('changeUITable', this);
    });

    Socket.on('systemConfig', (data) => {
      this.systemConfig = data;
      this.emit('changeSystemConfig', this);
    });

    // common event handler from frontend other view
    this.on('changeAlias', (caller) => {
      if(caller !== this) Socket.emit('alias', this.alias);
    });

    this.on('changeRemocon', (caller) => {
      if(caller !== this) Socket.emit('remocon', this.remocon);
    });

    this.on('changeUITable', (caller) => {
      if(caller !== this) Socket.emit('uiTable', this.uiTable);
    });
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
}

export default Common;
