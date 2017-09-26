/*

  frontend/js/pairing.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue'
import VueStrap from 'vue-strap'
import ViewPairing from '../view/pairing.html'

class Pairing {

  constructor(common) {

    this._common = common;
    
    socket.on(this._common.eventFromBackend.response, this._Response.bind(this));
    this._common.On(this._common.events.changeDevices, (_caller) => {
      if(!this._vue) return;
      for(let dev of this._common.devices) {
        if(dev.device == 'pairing') {
          if(dev.state != 'connect') {
            this._vue.progress = 0;
            this._vue.moduleLabel = '';
          }
          break;
        }
      }
    }, this);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_pairing').innerHTML = ViewPairing;
      this._vue = new Vue({
        el: '#tab_pairing',
        data: {
          progress: 0,
          moduleLabel: '',
        },
        computed: {
          progressing: function() {
            return (this.progress != 0) && (this.progress != 100);
          },
        },
        methods: {
          ExecutePairing: this._ExecutePairing.bind(this),
        },
        components: {
          'progressbar' : VueStrap.progressbar,
        },
      });
    });
  }
  
  _Response(msg) {
    if((msg.data[0].command == this._configCommand) || (msg.data[0].command == 'moduleauth')) {
      if(msg.data[0].status == 'error') {
        toastr.error(msg.data[0].message);
        this._vue.progress = 0;
      } else if(msg.data[0].status == 'ok') {
        toastr.success('ペアリング完了');
        this._vue.progress = 100;
        this._vue.moduleLabel = this._newDevice.name + ' : ' + this._newDevice.device;
      } else {
        const message = msg.data[0].message;
        if(message.search(/Start module firmware update/) >= 0) {
          toastr.info('ファームウェア更新開始');
          this._vue.progress = 20;
          setTimeout(() => {
            toastr.info('ファームウェア更新中');
            this._vue.progress = 30;
          }, 5000);
        }
        if(message.search(/HA module XBee Info/) >= 0) {
          const str = message.match(/SerialNumber :.*/);
          if(str) {
            const dev = str[0].replace(/^.*-/,'');
            if(dev) {
              let c = 0;
              while(1) {
                const name = 'new_device' + c;
                let f = false;
                for(let id in this._common.alias) {
                  if(this._common.alias[id].name == name) {
                    f = true;
                    break;
                  }
                }
                if(!f) {
                  this._common.alias[dev] = {name: name};
                  this._newDevice = {name:name, device:dev};
                  this._common.Trigger(this._common.events.changeAlias, this);
                  break;
                }
                c++;
              }
            }
          }
          toastr.info('ファームウェア更新完了');
          this._vue.progress = 35;
        }
        if(message.search(/HA module XBee update/) >= 0) {
          toastr.info('XBee更新開始');
          this._vue.progress = 40;
          setTimeout(() => {
            toastr.info('XBee更新中');
            this._vue.progress = 45;
            setTimeout(() => {
              toastr.info('XBee更新中');
              this._vue.progress = 50;
            }, 10000);
          }, 10000);
        }
        if(message.search(/Wait Coordinator/) >= 0) {
          let n = parseInt(message.replace(/^.*bring up /, ''));
          if(n == 0) {
　　　　　　  toastr.info('無線接続開始');
　　　　　　}
          this._vue.progress = 60 + n;
        }
        if(message.search(/Bootup HA-Micro/) >= 0) {
          toastr.info('マイコン起動');
          this._vue.progress = 85;
        }
        if(message.search(/PairingSequence/) >= 0) {
          toastr.info('ペアリング中');
          this._vue.progress = 90;
        }
        if(message.search(/Start validate module/) >= 0) {
          toastr.info('モジュール動作確認');
          this._vue.progress = 95;
        }
      }
    }
  }

  _ExecutePairing() {
    toastr.clear();
    toastr.info('モジュール接続開始');
    this._vue.progress = 10;
    
    this._configCommand = 'config c0000000 F';
    socket.emit(this._common.eventToBackend.command, 
        {type:'command', device:'0', command:this._configCommand});
  }
}

export default Pairing;
