/*

  frontend/js/moduleList.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue'
import VueStrap from 'vue-strap'
import ViewModuleList from '../view/moduleList.html'

class ModuleList {

  constructor(common) {

    this._common = common;
    
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.On(this._common.events.changeDevices, (_caller) => {
      if(this._vue) this._vue.devices = this._common.devices;
    }, this);
    this._common.On(this._common.events.changeAlias, (_caller) => {
      if(this._vue) this._vue.alias = this._common.alias;
    }, this);
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_moduleList').innerHTML = ViewModuleList;
      this._vue = new Vue({
        el: '#tab_moduleList',
        data: {
          devices: this._common.devices,
          alias: this._common.alias,
          selectedDevice: null,
        },
        computed: {
          actualDevices: function() {
            return this.devices.filter(function (dev) {
              return dev.device != 'pairing';
            });
          },
        },
        methods: {
          Delete: (device) => {
            for(let i in this._vue.devices) {
              if(this._vue.devices[i].device == device) {
                this._vue.devices.splice(i, 1);
                this._common.Trigger(this._common.events.changeDevices, this);
                socket.emit(this._common.eventToBackend.command,
                  {type:'command', device:device, command:'rmdev'});
                break;
              }
            }
            this._vue.selectedDevice = null;
            Vue.delete(this._vue.alias, device);
            this._common.Trigger(this._common.events.changeAlias, this);
          },
          Update: (device) => {
            socket.emit(this._common.eventToBackend.command,
                  {type:'command', device:device, command:'update'});
            this._vue.selectedDevice = null;
          },
        },
        components: {
          'progressbar' : VueStrap.progressbar,
        },
      });
    });
  }
}

export default ModuleList;
