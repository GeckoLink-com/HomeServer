/*

  frontend/js/linkDevices.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import ViewLinkDevices from '../view/linkDevices.html';
import VueQRcode from 'v-qrcode';

class LinkDevices {
  constructor(common) {
    this._common = common;

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.On(this._common.events.changeSystemConfig, (_caller) => {
      if(!this._vue) return;
      this._vue.hap = this._common.systemConfig.hap;
      this._vue.hapPin = this._common.systemConfig.bridge.pin;
      this._vue.hapSetupURI = this._common.systemConfig.bridge.setupURI;
      this._vue.hapDeviceId = this._common.systemConfig.bridge.username;
      this._vue.smartMeterEnable = this._common.systemConfig.smartMeter;
      this._vue.smartMeterAdapter = this._common.systemConfig.smartMeterAdapter;
      if(!this._vue.smartMeterAdapter) this._vue.smartMeterAdapter = this._vue.smartMeterAdapters[0];
      const id = this._common.systemConfig.smartMeterID;
      for(let i = 0; i < 8; i++) {
        if(id && (id.length === 4 * 8)) {
          this._vue.smartMeterID[i] = id.substr(4 * i, 4);
        } else {
          this._vue.smartMeterID[i] = '';
        }
      }
      const pw = this._common.systemConfig.smartMeterPassword;
      for(let i = 0; i < 3; i++) {
        if(pw && (pw.length === 4 * 3)) {
          this._vue.smartMeterPassword[i] = pw.substr(4 * i, 4);
        } else {
          this._vue.smartMeterPassword[i] = '';
        }
      }
    });
    this._common.On(this._common.events.changeSmartMeter, (_caller) => {
      if(this._vue) this._vue.smartMeterConnect = this._common.smartMeter;
    });
    this._common.On(this._common.events.changeHueBridges, (_caller) => {
      if(this._vue) this._vue.hueBridges = this._common.hueBridges;
    });
    this._common.On(this._common.events.changeAlias, () => {
      if(this._vue) this._vue.alias = this._common.alias;
    }, this);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_linkDevices').innerHTML = ViewLinkDevices;
      this._vue = new Vue({
        el: '#tab_linkDevices',
        data: {
          alias: this._common.alias,
          hueBridges: this._common.hueBridges || [],
          hap: false,
          hapPin: '',
          hapSetupURI: '',
          hapDeviceId: '',
          smartMeterEnable: false,
          smartMeterConnect: false,
          smartMeterAdapters: [
            { id: 'bp35a1', name: 'JORJIN WSR35A1-00' },
            { id: 'rl7023', name: 'TESSERA TECHNOLOGY RL7023 Stick-D/DSS' },
            { id: 'bp35c2', name: 'ROHM BP35C2' },
          ],
          smartMeterAdapter: '',
          smartMeterID: ['', '', '', '', '', '', '', ''],
          smartMeterPassword: ['', '', ''],
        },
        methods: {
          LightFlash: (e) => {
            const id = e.target.dataset.id;
            const light = e.target.dataset.light;
            socket.emit(this._common.eventToBackend.command,
              { type: 'command', device: 'Hue_' + id + '_' + light, command: 'flash' });
          },
          HuePairing: (e) => {
            const id = e.target.dataset.id;
            socket.emit(this._common.eventToBackend.command,
              { type: 'command', device: 'Hue_' + id, command: 'pairing' });
          },
          HueSearch: (e) => {
            const id = e.target.dataset.id;
            socket.emit(this._common.eventToBackend.command,
              { type: 'command', device: 'Hue_' + id, command: 'search' });
          },
          BTPairing: (e) => {
            console.log(e.target);
          },
          SmartMeterIDValid: function(idx) {
            if(this.smartMeterID[idx].length !== 4) return { error: true };
            if(('0000' + parseInt(this.smartMeterID[idx], 16).toString(16).toUpperCase()).slice(-4) !== this.smartMeterID[idx]) return { error: true };
            return {};
          },
          SmartMeterPasswordValid: function(idx) {
            if(this.smartMeterPassword[idx].length !== 4) return { error: true };
            if(this.smartMeterPassword[idx].toUpperCase() !== this.smartMeterPassword[idx]) return { error: true };
            return {};
          },
          Submit: () => {
            for(const bridge of this._vue.hueBridges) {
              for(const l in bridge.lights) {
                Vue.set(this._vue.alias, 'Hue_' + bridge.id + '_' + l, {
                  name: bridge.lights[l].name,
                  type: 'hue',
                  switch: {
                    name: '',
                    valueLabel: { '0': 'off', '1': 'on', '2': 'toggle' },
                  },
                });
                socket.emit(this._common.eventToBackend.command,
                  { type: 'command', device: 'Hue_' + bridge.id + '_' + l, command: 'name ' + bridge.lights[l].name });
              }
            }
            this._common.Trigger(this._common.events.changeAlias, this);
            this._common.systemConfig.bridge.username = this._vue.hapDeviceId;
            this._common.systemConfig.smartMeterAdapter = this._vue.smartMeterAdapter;
            let id = '';
            for(let i = 0; i < 8; i++) {
              if(this._vue.smartMeterID[i].length === 4) {
                id += this._vue.smartMeterID[i];
              } else {
                id = '';
                break;
              }
            }
            this._common.systemConfig.smartMeterID = id;
            let pw = '';
            for(let i = 0; i < 3; i++) {
              if(this._vue.smartMeterID[i].length === 4) {
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
        components: {
          'qrcode': VueQRcode,
        },
      });
    });
  }
}

export default LinkDevices;
