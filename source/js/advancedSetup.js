/*

  frontend/js/advancedSetup.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue'
import VueStrap from 'vue-strap'
import SlideSwitch from './SlideSwitch.vue'
import ViewAdvancedSetup from '../view/advancedSetup.html'
/*
 option value : bit 31:0
   AVR  HB   ---- ---- : KPD  MTR  LED  RAIN : I2C  IRI  IRO  SW   : HA1  HA0  AD1  AD0
   PU1  SW2I SW1I SW0I : HA1I HA0I GPI1 GPI0 : PU0  SW2O SW1O SW0O : HA1O HA0O GPO1 GPO0
*/

class AdvancedSetup {

  constructor(common) {

    this._common = common;

    this._moduleOption = (1 << 31) | (1 << 30);
    this._moduleLabels = {};

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
    this._common.On(this._common.events.changeSystemConfig, () => {
      if(!this._vue) return;
      this._vue.ledTapeEnable = this._common.systemConfig.led;
      this._vue.motorEnable = this._common.systemConfig.motor;
    }, this);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_advancedSetup').innerHTML = ViewAdvancedSetup;
      this._vue = new Vue({
        el: '#tab_advancedSetup',
        data: {
          selectedModule: '',
          selectedModuleLabel: '設定するモジュール',
          devices: this._common.devices,
          alias: this._common.alias,
          moduleName: '',
          moduleNameAlert: '',
          moduleType: '',
          ledTapeEnable: this._common.systemConfig?this._common.systemConfig.led:false,
          motorEnable: this._common.systemConfig?this._common.systemConfig.motor:false,
          heartbeat: { sw:1 },
          motor: { sw: 0 },
          remoconTx: { sw:0 },
          remoconRx: { sw:0 },
          ad: [
            { sw:0, name: '', type: 'other', offset: 0, gain: 1, unit: ''},
            { sw:0, name: '', type: 'other', offset: 0, gain: 1, unit: ''},
            { sw:0, name: '', type: 'other', offset: 0, gain: 1, unit: ''},
            { sw:0, name: '', type: 'other', offset: 0, gain: 1, unit: ''},
          ],
          rainSensor: { sw:0 },
          ledTape: { sw:0 },
          gpio: [
            { sw:0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other', delay: 0},
            { sw:0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other', delay: 0},
            { sw:0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other'},
            { sw:0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other'},
          ],
          ha: [
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
          ],
          hai: [
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
          ],
          hao: [
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
          ],
          sw: { sw:0, name: '', optionValue: 0, },
          swio: [
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
            { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }, },
          ],
          adFuncTable: [
            { name:'温度センサー', type:'temp', unit:'°C', offset:-500, gain:0.1 },
            { name:'湿度センサー', type:'humidity', unit:'%', offset:-500, gain:0.045 },
            { name:'降雨センサー', type:'rain', unit:'', offset:0, gain:0.024 },
            { name:'騒音センサー', type:'noise', unit:'', offset:0, gain:1 },
            { name:'バッテリー', type:'battery', unit:'mV', offset:0, gain:17.5 },
            { name:'その他', type:'other', unit:'', offset:0, gain:1 },
         ],
          gpioFuncTable: [
            { name:'人感センサー', type:'motion', valueLabel:{'0':'off', '1':'on' } },
            { name:'報知機センサー', type:'alarm', valueLabel:{'0':'off', '1':'on' } },
            { name:'フラップセンサー', type:'flap', valueLabel:{'0':'off', '1':'on' } },
            { name:'その他', type:'other', valueLabel:{'0':'off', '1':'on' } },
          ],
          buttonsOnOff: [{label:'on', val:1}, {label:'off', val:0}],
          buttonsInOutOff: [{label:'in', val:2}, {label:'out', val:1}, {label:'off', val:0}],
          buttonsPlupNone: [{label:'plup', val:1}, {label:'none', val:0}],
        },
        computed: {
          moduleList: function() {
            const moduleList = [];
            for(let i in this.devices) {
              const dev = this.devices[i];
              if(dev.device == 'pairing') continue;
              let name = '';
              if(dev.device in this.alias) name = this.alias[dev.device].name;
              moduleList.push({
                device: dev.device,
                name: name,
                label: dev.device + ((name.length > 0)?':':'') + name,
                enable: dev.state == 'alive',
              });
            }
            return moduleList;
          },
          isAVR: function() {
            return (this.moduleType == 'HA/FC') ||
                   (this.moduleType == 'RP/IR');
          },
        },
        methods: {
          SelectModule: this._SelectModule.bind(this),
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
          Submit: this._ValidateValue.bind(this),
        },
        components: {
          'dropdown' : VueStrap.dropdown,
          'slide-switch' : SlideSwitch,
        },
      });
    });
  }
  
  _SelectModule(e) {

    toastr.clear();
    const device = e.target.dataset.device;
    const name = e.target.dataset.name;
    const enable = e.target.dataset.enable;
    if(!enable) return;

    this._vue.selectedModuleLabel = device + ((name.length > 0)?':':'') + name;
    this._vue.selectedModule = device;
    this._vue.moduleName = name;
    this._vue.ModuleNameCheck();

    const moduleOption = parseInt(this._common.deviceTable[device].option, 16);
    this._vue.moduleType = this._common.deviceTable[device].type;
    const param = parseInt(this._common.deviceTable[device].param, 16);

    if(!this._vue.isAVR) {
      for(let i = 2; i < 4; i++) {
        // AD
        this._vue.ad[i].sw = (moduleOption >> (i - 2)) & 1;
        if(this._common.alias[device] && this._common.alias[device]['ad' + i]) {
          this._vue.ad[i].name = this._common.alias[device]['ad' + i].name;
          this._vue.ad[i].type = this._common.alias[device]['ad' + i].type;
        } else {
          this._vue.ad[i].name = '';
          this._vue.ad[i].type = '';
        }
        // GPIO
        this._vue.gpio[i].sw = (moduleOption >> i) & 1;
        this._vue.gpio[i].pull = (moduleOption >> (i + 2)) & 1;
        if(this._common.alias[device] && this._common.alias[device]['gpio' + i]) {
          this._vue.gpio[i].name = this._common.alias[device]['gpio' + i].name;
          this._vue.gpio[i].type = this._common.alias[device]['gpio' + i].type;
          if(this._vue.gpio[i].type == 'other') {
            this._vue.gpio[i].valueLabel = this._common.alias[device]['gpio' + i].valueLabel || {'0':'off', '1':'on'};
          }
        } else {
          this._vue.gpio[i].name = '';
          this._vue.gpio[i].type = 'other';
          this._vue.gpio[i].valueLabel = {'0':'off', '1':'on'};
        }
      }
      return;
    }

    this._vue.heartbeat.sw = (moduleOption >> 30) & 1;
    this._vue.remoconTx.sw = (moduleOption >> 21) & 1;
    this._vue.remoconRx.sw = (moduleOption >> 22) & 1;

    // AD
    for(let i = 0; i < 2; i++) {
      this._vue.ad[i].sw = (moduleOption >> (16 +i)) & 1;
      if(this._common.alias[device] && this._common.alias[device]['ad' + i]) {
        this._vue.ad[i].name = this._common.alias[device]['ad' + i].name;
        this._vue.ad[i].type = this._common.alias[device]['ad' + i].type;
      } else {
        this._vue.ad[i].name = '';
        this._vue.ad[i].type = '';
      }
    }
    // RAIN
    this._vue.rainSensor.sw = (moduleOption >> 24) & 1;
    // LEDTape
    this._vue.ledTape.sw = this._vue.ledTapeEnable?((moduleOption >> 25) & 1):0;
    // Motor
    this._vue.motor.sw = this._vue.motorEnable?((moduleOption >> 26) & 1):0;
    if(this._common.alias[device] && this._common.alias[device].motor) {
      this._vue.motor.optionValue = this._common.alias[device].motor.optionValue;
    } else {
      this._vue.motor.optionValue = this._vue.motor.sw?param:1;
    }
    // GPIO
    for(let i = 0; i < 2; i++) {
      this._vue.gpio[i].sw = ((moduleOption >> (0 + i)) & 1) || ((moduleOption >> (7 + i)) & 2);
      this._vue.gpio[i].pull = (moduleOption >> (7 + 8 * i)) & 1;
      if(this._common.alias[device] && this._common.alias[device]['gpio' + i]) {
        this._vue.gpio[i].name = this._common.alias[device]['gpio' + i].name;
        this._vue.gpio[i].type = this._common.alias[device]['gpio' + i].type;
        this._vue.gpio[i].delay = this._common.alias[device]['gpio' + i].delay || 0;
        if(this._vue.gpio[i].type == 'other') {
          this._vue.gpio[i].valueLabel = this._common.alias[device]['gpio' + i].valueLabel || {'0':'off', '1':'on'};
        }
      } else {
        this._vue.gpio[i].name = '';
        this._vue.gpio[i].type = 'other';
        this._vue.gpio[i].valueLabel = {'0':'off', '1':'on'};
      }
    }
    for(let i = 0; i < 2; i++) {
      // HA
      this._vue.ha[i].sw = (moduleOption >> (18 + i)) & 1;
      if(this._common.alias[device] && this._common.alias[device]['ha' + i]) {
        this._vue.ha[i].name = this._common.alias[device]['ha' + i].name;
        this._vue.ha[i].valueLabel = this._common.alias[device]['ha' + i].valueLabel || {'0':'off', '1':'on'};
      } else {
        this._vue.ha[i].name = '';
        this._vue.ha[i].valueLabel = {'0':'off', '1':'on'};
      }
      // HAI
      this._vue.hai[i].sw = (moduleOption >> (10 + i)) & 1;
      if(this._common.alias[device] && this._common.alias[device]['hai' + i]) {
        this._vue.hai[i].name = this._common.alias[device]['hai' + i].name;
        this._vue.hai[i].valueLabel = this._common.alias[device]['hai' + i].valueLabel || {'0':'off', '1':'on'};
      } else {
        this._vue.hai[i].name = '';
        this._vue.hai[i].valueLabel = {'0':'off', '1':'on'};
      }    
      // HAO
      this._vue.hao[i].sw = (moduleOption >> (2 + i)) & 1;
      if(this._common.alias[device] && this._common.alias[device]['hao' + i]) {
        this._vue.hao[i].name = this._common.alias[device]['hao' + i].name;
        this._vue.hao[i].valueLabel = this._common.alias[device]['hao' + i].valueLabel || {'0':'off', '1':'on'};
      } else {
        this._vue.hao[i].name = '';
        this._vue.hao[i].valueLabel = {'0':'off', '1':'on'};
      }    
    }
    
    // SW
    this._vue.sw.sw = (moduleOption >> 20) & 1;
    if(this._common.alias[device] && this._common.alias[device].sw) {
      this._vue.sw.name = this._common.alias[device].sw.name;
      this._vue.sw.optionValue = this._common.alias[device].sw.optionValue;
    } else {
      this._vue.sw.name = '';
      this._vue.sw.optionValue = this._vue.sw.sw?param:0;
    }
    // SWIO
    for(let i = 0; i < 3; i++) {
      this._vue.swio[i].sw = ((moduleOption >> (12 + i)) | (moduleOption >> (4 + i))) & 1;
      if(this._common.alias[device] && this._common.alias[device]['swio' + i]) {
        this._vue.swio[i].name = this._common.alias[device]['swio' + i].name;
        this._vue.swio[i].valueLabel = this._common.alias[device]['swio' + i].valueLabel || {'0':'off', '1':'on'};
      } else {
        this._vue.swio[i].name = '';
        this._vue.swio[i].valueLabel = {'0':'off', '1':'on'};
      }
    }
  }

  _ValidateValue() {

    if(this._vue.moduleNameAlert.length) return;
    if(!this._vue.isAVR) {
      let newOption = 0;
      for(let i = 2; i < 4; i++) {
        newOption |= this._vue.ad[i].sw << (i - 2);
        newOption |= this._vue.gpio[i].sw << i;
        newOption |= this._vue.gpio[i].pull << (i + 2);
      }
      const moduleAlias = {
        name: this._vue.moduleName,
        option: newOption.toString(16)
      };

      for(let i = 2; i < 4; i++) {
        if(this._vue.ad[i].sw) {
          moduleAlias['ad' + i] = {
            name: this._vue.ad[i].name,
            type: this._vue.ad[i].type
          };
          if(this._vue.ad[i].type == 'other') {
            moduleAlias['ad' + i].offset = this._vue.ad[i].offset;
            moduleAlias['ad' + i].gain = this._vue.ad[i].gain;
            moduleAlias['ad' + i].unit = this._vue.ad[i].unit;
          } else {
            for(let j in this._vue.adFuncTable) {
              const item = this._vue.adFuncTable[j];
              if((item.type == this._vue.ad[i].type) ||
                 (item.type == 'other')) {
                moduleAlias['ad' + i].offset = item.offset;
                moduleAlias['ad' + i].gain = item.gain;
                moduleAlias['ad' + i].unit = item.unit;
                break;
              }
            }
          }
        }
        if(this._vue.gpio[i].sw) {
          if(this._vue.gpio[i].sw) {
            moduleAlias['gpio' + i] = {
              name: this._vue.gpio[i].name,
              type: this._vue.gpio[i].type,
            };
          }
          if(this._vue.gpio[i].sw == 1)
            moduleAlias['gpio' + i].type == 'out'
          if(this._vue.gpio[i].type == 'other') {
            moduleAlias['gpio' + i].valueLabel = this._vue.gpio[i].valueLabel;
          } else {
            for(let j in this._vue.gpioFuncTable) {
              const item = this._vue.gpioFuncTable[j];
              if((item.type == this._vue.gpio[i].type) ||
                 (item.type == 'other')) {
                moduleAlias['gpio' + i].valueLabel = item.valueLabel;
                break;
              }
            }
          }
        }
      }
      
      Vue.set(this._vue.alias, this._vue.selectedModule, moduleAlias);
      this._common.Trigger(this._common.events.changeAlias, this);
      this._configCommand = 'config ' + newOption.toString(16) + ' W';
      socket.emit(this._common.eventToBackend.command,
          {type:'command', device:this._vue.selectedModule, command:this._configCommand});
      return;
    }
    
    let newOption = (1 << 31);
    newOption |= this._vue.heartbeat.sw << 30;
    newOption |= this._vue.motor.sw << 26;
    if(this._vue.motor.sw) {
      this._vue.ledTape.sw = 0;
      this._vue.rainSensor.sw = 0;
      this._vue.remoconRx.sw = 0;
      this._vue.remoconTx.sw = 0;
      this._vue.sw.sw = 0;
      this._vue.swio[0].sw = 0;
      this._vue.swio[2].sw = 0;
    }
    newOption |= this._vue.ledTape.sw << 25;
    if(this._vue.ledTape.sw) {
      this._vue.rainSensor.sw = 0;
      this._vue.gpio[0].sw = 0;
    }
    newOption |= this._vue.rainSensor.sw << 24;
    if(this._vue.rainSensor.sw) {
      this._vue.gpio[0].sw = 0;
      this._vue.gpio[1].sw = 0;
    }
    newOption |= this._vue.remoconRx.sw << 22;
    newOption |= this._vue.remoconTx.sw << 21;
    newOption |= this._vue.sw.sw << 20;
    if(this._vue.sw.sw) {
      this._vue.swio[0].sw = 0;
      this._vue.swio[1].sw = 0;
      this._vue.swio[2].sw = 0;
    }
    for(let i = 0; i < 2; i++) {
      if(this._vue.ha[i].sw) {
        this._vue.hai[i].sw = 0;
        this._vue.hao[i].sw = 0;
      }
      newOption |= this._vue.ad[i].sw << (16 + i);
      newOption |= (this._vue.gpio[i].sw == 1)?(1 << (0 + i)): 0;
      newOption |= (this._vue.gpio[i].sw == 2)?(1 << (8 + i)): 0;
      newOption |= this._vue.ha[i].sw << (18 + i);
      newOption |= this._vue.hai[i].sw << (10 + i);
      newOption |= this._vue.hao[i].sw << (2 + i);
      newOption |= this._vue.gpio[i].pull << (7 + 8 * i);
    }
    for(let i = 0; i < 3; i++) {
      newOption |= this._vue.swio[i].sw << (12 + i);
      newOption |= this._vue.swio[i].sw << (4 + i);
    }
    if(newOption < 0) newOption += Math.pow(2, 32);

    const moduleAlias = {
      name: this._vue.moduleName,
      option: newOption.toString(16)
    };
    let param = '';
    if(this._vue.motor.sw) {
      moduleAlias['motor'] = {
        name: '',
        optionValue: this._vue.motor.optionValue,
      }
      if(!this._vue.motor.optionValue || (this._vue.motor.optionValue==''))
        this._vue.motor.optionValue = 1;
      param = this._vue.motor.optionValue;
    } else if(this._vue.sw.sw) {
      moduleAlias['sw'] = {
        name: this._vue.sw.name,
        optionValue: this._vue.sw.optionValue,
        valueLabel: { '0': 'open', '1': 'stop', '2': 'close' },
      }
      if(!this._vue.sw.optionValue || (this._vue.sw.optionValue==''))
        this._vue.sw.optionValue = 0;
      param = this._vue.sw.optionValue;
    } else {
      for(let i = 0; i < 2; i++) {
        if((this._vue.gpio[i].sw == 2) && (this._vue.gpio[i].type == 'motion')) {
          param = this._vue.gpio[i].delay;
        }
      }
    }

    for(let i = 0; i < 3; i++) {
      if(this._vue.swio[i].sw) {
        moduleAlias['swio' + i] = {
          name: this._vue.swio[i].name,
          valueLabel: this._vue.swio[i].valueLabel,
        }
      }
      if(i == 2) continue;

      if(this._vue.ad[i].sw) {
        moduleAlias['ad' + i] = {
          name: this._vue.ad[i].name,
          type: this._vue.ad[i].type
        };
        if(this._vue.ad[i].type == 'other') {
          moduleAlias['ad' + i].offset = this._vue.ad[i].offset;
          moduleAlias['ad' + i].gain = this._vue.ad[i].gain;
          moduleAlias['ad' + i].unit = this._vue.ad[i].unit;
        } else {
          for(let j in this._vue.adFuncTable) {
          const item = this._vue.adFuncTable[j];
            if((item.type == this._vue.ad[i].type) ||
               (item.type == 'other')) {
              moduleAlias['ad' + i].offset = item.offset;
              moduleAlias['ad' + i].gain = item.gain;
              moduleAlias['ad' + i].unit = item.unit;
              break;
            }
          }
        }
      }
      if(this._vue.gpio[i].sw) {
        if(this._vue.gpio[i].sw==1) {
          moduleAlias['gpio' + i] = {
            name: this._vue.gpio[i].name,
            type: 'out',
          };
        } else {
          moduleAlias['gpio' + i] = {
            name: this._vue.gpio[i].name,
            type: this._vue.gpio[i].type,
            delay: (this._vue.gpio[i].type == 'motion')?this._vue.gpio[i].delay:0,
          };
        }
        if((this._vue.gpio[i].type == 'other')||(this._vue.gpio[i].sw==1)) {
          moduleAlias['gpio' + i].valueLabel = this._vue.gpio[i].valueLabel;
        } else {
          for(let j in this._vue.gpioFuncTable) {
            const item = this._vue.gpioFuncTable[j];
            if((item.type == this._vue.gpio[i].type) ||
               (item.type == 'other')) {
              moduleAlias['gpio' + i].valueLabel = item.valueLabel;
              break;
            }
          }
        }
      }
      if(this._vue.ha[i].sw) {
        moduleAlias['ha' + i] = {
          name: this._vue.ha[i].name,
          valueLabel: this._vue.ha[i].valueLabel,
        }
      }
      if(this._vue.hai[i].sw) {
        moduleAlias['hai' + i] = {
          name: this._vue.hai[i].name,
          valueLabel: this._vue.hai[i].valueLabel,
        }
      }
      if(this._vue.hao[i].sw) {
        moduleAlias['hao' + i] = {
          name: this._vue.hao[i].name,
          valueLabel: this._vue.hao[i].valueLabel,
        }
      }
    }
    
    Vue.set(this._vue.alias, this._vue.selectedModule, moduleAlias);
    this._common.Trigger(this._common.events.changeAlias, this);
    this._configCommand = ('config ' + newOption.toString(16) + ' F ' + param).trim();
    console.log(this._configCommand);
    socket.emit(this._common.eventToBackend.command,
        {type:'command', device:this._vue.selectedModule, command:this._configCommand});
  }
}

export default AdvancedSetup;

