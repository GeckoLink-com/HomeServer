/*

  frontend/js/debugPanel.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import VueStrap from 'vue-strap';
import ViewDebugPanel from '../view/debugPanel.html';

class DebugPanel {
  constructor(common) {
    this._common = common;

    socket.on(this._common.eventFromBackend.status, (status) => {
      if(this._vue) this._vue.status = status;
    });
    socket.on(this._common.eventFromBackend.response, this._Response.bind(this));
    socket.on(this._common.eventFromBackend.events, this._Events.bind(this));
    socket.on(this._common.eventFromBackend.queueInfo, (queue) => {
      if(this._vue) this._vue.queue = queue.data;
    });
    socket.on(this._common.eventFromBackend.controllerLog, (log) => {
      if(this._vue) this._vue.controllerLog = log;
    });
    this._common.On(this._common.events.changeDevices, () => {
      if(this._vue) this._vue.devices = this._common.devices;
    }, this);
    this._common.On(this._common.events.changeAlias, () => {
      if(this._vue) this._vue.alias = this._common.alias;
    }, this);
    this._common.On(this._common.events.changeHueBridges, () => {
      if(this._vue) this._vue.hueLights = this._common.hueLights;
    }, this);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_debugPanel').innerHTML = ViewDebugPanel;
      this._vue = new Vue({
        el: '#tab_debugPanel',
        data: {
          devices: this._common.devices,
          hueLights: this._common.hueLights || [],
          alias: this._common.alias,
          command: '',
          response: '',
          responseFlag: false,
          events: '',
          eventsFlag: false,
          status: [],
          queue: [],
          controllerLog: [],
        },
        computed: {
          actualDevices: function() {
            return this.devices.filter(function(dev) {
              return dev.device !== 'pairing';
            });
          },
          moduleList: function() {
            const moduleList = [];
            moduleList.push({ device: 0, label: 'server', enable: true });
            for(const dev of this.devices) {
              if(dev.device === 'pairing') continue;
              let name = '';
              if(dev.device in this.alias) name = this.alias[dev.device].name;
              moduleList.push({
                device: dev.device,
                name: name,
                label: dev.device + ((name.length > 0) ? ':' : '') + name,
                enable: dev.state === 'alive',
              });
            }
            for(const dev of this.hueLights) {
              moduleList.push({
                device: dev.device,
                name: dev.name,
                label: dev.name,
                enable: true,
              });
            }

            return moduleList;
          },
        },
        methods: {
          SelectModule: (e) => {
            const device = e.target.dataset.device;
            const enable = e.target.dataset.enable;
            if(!enable) return;
            socket.emit(this._common.eventToBackend.command, {
              type: 'command',
              device: device,
              command: this._vue.command.replace(/[\r\n]+/g, ' '),
            });
          },
          QueueDecode(code) {
            let ret = '';
            for(const j in code) {
              ret += ('0' + code[j].toString(16)).slice(-2) + ' ';
            }
            return ret;
          },
          LogText(msg) {
            switch (msg.type) {
              case 'command':
                return msg.body.command;
              case 'response':
                return (msg.body.origin.command || msg.body.origin.func + ' ' + msg.body.origin.mode) + ' -> ' + msg.body.status;
              case 'change':
                return msg.body.funcName + ' ' + msg.body.func + ' = ' + msg.body.valueName;
              case 'irreceive':
                return msg.body.format + ' ' + msg.body.comment;
              default:
                return '';
            }
          },
        },
        updated: function() {
          if(this.responseFlag) {
            const responsePanel = document.getElementById('response');
            responsePanel.scrollTop = responsePanel.scrollHeight;
            this.responseFlag = false;
          }
          if(this.eventsFlag) {
            const eventPanel = document.getElementById('events');
            eventPanel.scrollTop = eventPanel.scrollHeight;
            this.eventsFlag = false;
          }
        },
        components: {
          'dropdown': VueStrap.dropdown,
        },
      });
    });
  }

  _Response(msg) {
    for(const data of msg.data) {
      switch (msg.type) {
        case 'response':
          if('message' in data) this._vue.response += data.message;
          this._vue.response += 'status : ' + data.status + '\n';
          break;
        case 'message':
          this._vue.response += data.message;
          break;
        default:
          break;
      }
    }
    this._vue.responseFlag = true;
  }

  _Events(msg) {
    let events = '[' + msg.type + ']\n';
    for(const data of msg.data) {
      switch (msg.type) {
        case 'change':
          events += '  ' + (data.funcName ? data.funcName : ((data.deviceName ? data.deviceName : data.device) + ' : ' + data.func)) + ' ' + data.value + '\n';
          break;
        case 'irreceive':
          events += '  module : ' + (data.deviceName ? data.deviceName : data.device) + '\n';
          events += '  format : ' + data.format + '\n';
          if('code' in data) {
            events += '  code : ';
            for(const d of data.code) {
              events += ('0' + d.toString(16)).slice(-2) + ' ';
            }
            events += '\n';
          }
          if('name' in data) {
            events += '  name : ' + data.name + '\n';
          }
          if('comment' in data) {
            events += '  comment : ' + data.comment + '\n';
          }
          break;
        case 'motor':
          events += JSON.stringify(data) + '\n';
          break;
        default:
          break;
      }
    }
    this._vue.events += events;
    this._vue.eventsFlag = true;
  }
}

export default DebugPanel;
