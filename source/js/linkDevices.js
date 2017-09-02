/*

  frontend/js/linkDevices.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

class LinkDevices {

  constructor(common) {

    this._common = common;
    
    this._common.On(this._common.events.changeSystemConfig, (caller) => {
      if(!this._vue) return;
      this._vue.hap = this._common.systemConfig.hap;
      this._vue.hapPin = this._common.systemConfig.bridge.pin;
      this._vue.hapDeviceId = this._common.systemConfig.bridge.username;
      this._vue.smartMeter = this._common.systemConfig.smartMeter;
      this._vue.smartMeterAdapter = this._common.systemConfig.smartMeterAdapter;
      if(!this._vue.smartMeterAdapter) this._vue.smartMeterAdapter = this._vue.smartMeterAdapters[0];
      const id = this._common.systemConfig.smartMeterID;
      for(let i = 0; i < 8; i++) {
        if(id && (id.length == 4 * 8)) {
          this._vue.smartMeterID[i] = id.substr(4 * i, 4);
        } else {
          this._vue.smartMeterID[i] = '';
        }
      }
      const pw = this._common.systemConfig.smartMeterPassword;
      for(let i = 0; i < 3; i++) {
        if(pw && (pw.length == 4 * 3)) {
          this._vue.smartMeterPassword[i] = pw.substr(4 * i, 4);
        } else {
          this._vue.smartMeterPassword[i] = '';
        }
      }
    });
    this._common.On(this._common.events.changeHueBridges, (caller) => {
      if(this._vue) this._vue.hueBridges = this._common.hueBridges;
    });
    this._common.On(this._common.events.changeAlias, () => {
      if(this._vue) this._vue.alias = this._common.alias;
    }, this);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_linkDevices').innerHTML = require('../view/linkDevices.html');
      this._vue = new Vue({
        el: '#tab_linkDevices',
        data: {
          alias: this._common.alias,
          hueBridges: this._common.hueBridges||[],
          hap: false,
          hapPin: '',
          hapDeviceId: '',
          smartMeter: false,
          smartMeterAdapters: [
            {id:'bp35a1', name:'ROHM WSR35A1-00'},
            {id:'rl7023', name:'TESSERA TECHNOLOGY RL7023 Stick-D/DSS'},
          ],
          smartMeterAdapter: 'bp35a1',
          smartMeterID: ['','','','','','','',''],
          smartMeterPassword: ['','',''],
        },
        methods: {
          LightFlash: (e) => {
            const id = e.target.dataset.id;
            const light = e.target.dataset.light;
            socket.emit(this._common.eventToBackend.command,
              {type:'command', device: 'Hue_' + id + '_' + light, command:'flash'});
          },
          HuePairing: (e) => {
            const id = e.target.dataset.id;
            socket.emit(this._common.eventToBackend.command, 
              {type:'command', device: 'Hue_' + id, command:'pairing'});
          },
          HueSearch: (e) => {
            const id = e.target.dataset.id;
            socket.emit(this._common.eventToBackend.command, 
              {type:'command', device: 'Hue_' + id, command:'search'});
          },
          BTPairing: (e) => {
            console.log(e.target);
          },
          SmartMeterIDValid: function(idx) {
            if(this.smartMeterID[idx].length != 4) return { error: true };
            if(('0000' + parseInt(this.smartMeterID[idx], 16).toString(16).toUpperCase()).slice(-4) != this.smartMeterID[idx]) return {error: true};
            return {};
          },
          SmartMeterPasswordValid: function(idx) {
            if(this.smartMeterPassword[idx].length != 4) return { error: true };
            if(this.smartMeterPassword[idx].toUpperCase() != this.smartMeterPassword[idx]) return {error: true};
            return {};
          },
          Submit: () => {
            for(let bridge of this._vue.hueBridges) {
              for(let l in bridge.lights) {
                Vue.set(this._vue.alias, 'Hue_' + bridge.id + '_' + l, {
                  name: bridge.lights[l].name,
                  type: 'hue',
                  switch: {
                    name: '',
                    valueLabel: {'0':'off', '1':'on', '2':'toggle'},
                  }
                });
                socket.emit(this._common.eventToBackend.command,
                  {type:'command', device: 'Hue_' + bridge.id + '_' + l, command:'name ' + bridge.lights[l].name});
              }
            }
            this._common.Trigger(this._common.events.changeAlias, this);
            this._common.systemConfig.bridge.username = this._vue.hapDeviceId;
            this._common.systemConfig.smartMeterAdapter = this._vue.smartMeterAdapter;
            let id = '';
            for(let i = 0; i < 8; i++) {
              if(this._vue.smartMeterID[i].length == 4) {
                id += this._vue.smartMeterID[i];
              } else {
                id = '';
                break;
              }
            }
            this._common.systemConfig.smartMeterID = id;
            let pw = '';
            for(let i = 0; i < 3; i++) {
              if(this._vue.smartMeterID[i].length == 4) {
                pw += this._vue.smartMeterPassword[i];
              } else {
                pw = '';
                break;
              }
            }
            this._common.systemConfig.smartMeterPassword = pw;
            socket.emit(this._common.eventToBackend.systemConfig, this._common.systemConfig);
          },
        },
      });
    });
  }
}

module.exports = LinkDevices;
