/*

  frontend/js/basicSetup.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

class BasicSetup {

  constructor(common) {

    this._common = common;

    socket.on(this._common.eventFromBackend.response, (msg) => {
      if(msg.data[0].command == this._configCommand) {
        if(msg.data[0].status == 'error') {
          toastr.error(msg.data[0].message);
        } else if(msg.data[0].status == 'ok') {
          toastr.success('書き込み完了');
        }
      }
    });
    this._common.On(this._common.events.changeDevices, () => {
      if(this._vue) this._vue.devices = this._common.devices;
    }, this);
    this._common.On(this._common.events.changeAlias, () => {
      if(this._vue) this._vue.alias = this._common.alias;
    }, this);
    
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_basicSetup').innerHTML = require('../view/basicSetup.html');
      this._vue = new Vue({
        el: '#tab_basicSetup',
        data: {
          selectedModule: '',
          selectedModuleLabel: '設定するモジュール',
          moduleName: '',
          moduleNameAlert: '',
          selectedType: -1,
          devices: this._common.devices,
          alias: this._common.alias,
          typeTable: [
            { funcId: '00000000', funcSel:[], name: '' },
            { funcId: 'c0040000', funcSel:['haOpenClose'], name: 'GL-1210 HA端子制御（電気錠等 open/close）' },
            { funcId: 'c0040000', funcSel:['haOnOff'], name: 'GL-1210 HA端子制御（給湯、床暖房等 on/off）' },
            { funcId: 'c0100000', funcSel:['sw'], name: 'GL-1220 弱電スイッチ制御（電動シャッター、電動窓、電動カーテン等）' },
            { funcId: 'c0600000', funcSel:[], name: 'GL-1230 赤外線リモコン送受信' },
            { funcId: 'c0030000', funcSel: ['temp', 'humidity'], name: 'GL-1240 温度・湿度センサー' },
            { funcId: 'c0250180', funcSel:['temp', 'haOnOff', 'flap'], name: 'GL-1250 エアコン制御' },
            { funcId: 'c0018380', funcSel: ['alarm', 'motion', 'noise'], name: 'GL-1260 火災警報器、人感、騒音センサー' },
          ],
          funcTable: [],
        },
        computed: {
          moduleList: function() {
            const moduleList = [];
            for(let i = 0; i < this.devices.length; i++) {
              const dev = this.devices[i];
              if(dev.device == 'pairing') continue;
              let name = '';
              if(dev.device in this.alias) name = this.alias[dev.device].name;
              moduleList.push({
                device: dev.device,
                name: name,
                label: dev.device + ((name.length > 0)?':':'') + name,
                enable: ((dev.state == 'alive') && ((parseInt(dev.option, 16) & (1 << 31)) != 0)),
              });
            }
            return moduleList;
          },
        },
        methods: {
          SelectModule: function(e) {
            toastr.clear();
            const device = e.target.dataset.device;
            const name = e.target.dataset.name;
            const enable = e.target.dataset.enable;
            if(!enable) return;

            this.selectedModuleLabel = device + ((name.length > 0)?':':'') + name;

            this.funcTable = [
              { name:'温度センサー', type:'temp', unit:'°C', func:'ad0', offset:-500, gain:0.1 },
              { name:'湿度センサー', type:'humidity', unit:'%', func:'ad1', offset:-500, gain:0.045 },
              { name:'降雨センサー', type:'rain', unit:'', func:'ad1', offset:0, gain:0.024 },
              { name:'騒音センサー', type:'noise', unit:'', func:'ad0', offset:0, gain:1 },
              { name:'人感センサー', type:'motion', label0:'off', label1:'on', func:'gpio1' },
              { name:'報知機センサー', type:'alarm', label0:'off', label1:'on', func:'gpio0' },
              { name:'フラップセンサー', type:'flap', label0:'off', label1:'on', func:'gpio0' },
              { name:'HA端子', type:'haOnOff', label0:'off', label1:'on', func:'ha0' },
              { name:'HA端子', type:'haOpenClose', label0:'open', label1:'close', func:'ha0' },
              { name:'弱電スイッチ', type:'sw', label0:'open', label1:'stop', label2:'close', func:'sw', option:'動作時間', optionUnit:'秒' },
            ];

            this.selectedModule = device;
            this.moduleName = name;
            this.ModuleNameCheck();
            if(this.alias[device] && this.alias[device].basicSelect) this.selectedType = parseInt(this.alias[device].basicSelect);
            const type = this.typeTable[this.selectedType];
            if(type) {
              for(let j in type.funcSel) {
                const item = type.funcSel[j];
                for(let i in this.funcTable) {
                  if(this.funcTable[i].type == item) {
                    const f = this.alias[device][this.funcTable[i].func];
                    this.funcTable[i].value = f.name;
                    this.funcTable[i].optionValue = f.optionValue;
                    break;
                  }
                }
              }
            }
          },
          ModuleNameCheck: function() {
            if(this.moduleName.length == 0) {
              this.moduleNameAlert = 'モジュール名をいれて下さい。';
              return;
            }
            if(this.moduleName.length < 4) {
              this.moduleNameAlert = 'モジュール名が短かすぎます。4文字以上にして下さい。';
              return;
            }
            for(let i in this.alias) {
              if(i == this.selectedModule) continue;
              if(this.alias[i].name == this.moduleName) {
                this.moduleNameAlert = '同じモジュール名があります。他の名前にしてください。';
                return;
              }
            }
            this.moduleNameAlert = '';
          },
          ItemCheck: function (idx) {
            if(!this.selectedType || (this.selectedType < 0)) return false;
            for(let t in this.typeTable[this.selectedType].funcSel) {
              if(this.typeTable[this.selectedType].funcSel[t] == this.funcTable[idx].type) return true;
            }
            return false;
          },
          Submit: () => {
            if(this._vue.moduleNameAlert.length) return;
            
            const type = this._vue.typeTable[this._vue.selectedType];
            if(!type) return;

            const moduleAlias = {
              name: this._vue.moduleName,
              basicSelect: this._vue.selectedType,
              option: type.funcId,
            };
            let param = '';
            for(let j in type.funcSel) {
              const item = type.funcSel[j];
              for(let i in this._vue.funcTable) {
                if(this._vue.funcTable[i].type == item) {
                  const f = this._vue.funcTable[i];
                  moduleAlias[f.func] = {
                    name: f.value,
                    valueLabel: {},
                    type: f.type,
                  };
                  if((f.func == 'ad0') || (f.func == 'ad1')) {
                    moduleAlias[f.func].offset = f.offset;
                    moduleAlias[f.func].gain = f.gain;
                    moduleAlias[f.func].unit = f.unit;
                  } else {
                    moduleAlias[f.func].valueLabel = {};
                    if(f.label0) moduleAlias[f.func].valueLabel['0'] = f.label0;
                    if(f.label1) moduleAlias[f.func].valueLabel['1'] = f.label1;
                    if(f.label2) moduleAlias[f.func].valueLabel['2'] = f.label2;
                  }
                  if(f.optionValue) {
                    moduleAlias[f.func].optionValue = f.optionValue;
                    param = ' ' + parseInt(f.optionValue).toString(16);
                  }
                  break;
                }
              }
            }
            Vue.set(this._vue.alias, this._vue.selectedModule, moduleAlias);
            this._common.Trigger(this._common.events.changeAlias, this);
            this._configCommand = ('config ' + type.funcId + ' F' + param).trim();
            socket.emit(this._common.eventToBackend.command, 
                {type:'command', device:this._vue.selectedModule, command:this._configCommand});
          },
        },
      });
    });
  }
}

module.exports = BasicSetup;
