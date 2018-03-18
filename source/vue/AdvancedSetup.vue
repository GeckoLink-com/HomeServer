<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3 scrollable">
      <br>
      <h4>詳細設定</h4>
      <br>
      <div class="module-image">
        <img src="../images/HB-6.png" alt="GL-1100" width="200px">
      </div>
      <br>

      <dropdown class="moduleLabel" :text="selectedModuleLabel">
        <li v-for="module of moduleList" :key="'as-moduleList' + module.name" class="module-list" :class="{disabled:!module.enable}" >
          <a href="#" :data-device="module.device" :data-name="module.name" :data-enable="module.enable" @click="Click" :disabled="!module.enable">
            {{ module.label }}
          </a>
        </li>
      </dropdown>
    </div>

    <div v-show="selectedModule!=''" class="col-sm-9 col-md-9 scrollable">
      <br>
      <div class="well" v-if="isAVR">
        <div>
          <label>モジュール名</label>
          <input :class="{error:moduleNameAlert.length}" type="text" v-model="moduleName" @input="ModuleNameCheck">
          <h6>設置場所等、識別しやすい名前を付けてください。</h6>
          <h6 v-if="moduleNameAlert.length" class="error">{{ moduleNameAlert }}</h6>
        </div>

        <div class="row well well-transparent">
          <div class="col-md-5">
            <h5>Heartbeat LED</h5>
          </div>
          <div class="col-md-7">
            <slide-switch v-model="heartbeat.sw" :buttons="buttonsOnOff"/>
          </div>
        </div>

        <div class="row" v-if="motorEnable">
          <div class="col-md-5">
            <h5>Motor制御</h5>
          </div>
          <div class="col-md-7">
            <slide-switch v-model="motor.sw" :buttons="buttonsOnOff"/>
            <fieldset class="btn-inline" :disabled="motor.sw==0">
              <div class="item-label">1回転のパルス数</div>
              <input class="state" type="text" v-model="motor.optionValue">
            </fieldset>
          </div>
        </div>

        <div class="row well well-transparent">
          <div class="col-md-5">
            <fieldset :disabled="motor.sw==1">
              <h5>赤外線リモコン送信</h5>
            </fieldset>
          </div>
          <div class="col-md-7">
            <slide-switch v-model="remoconTx.sw" :disabled="motor.sw==1" :buttons="buttonsOnOff"/>
          </div>
        </div>

        <div class="row well well-transparent">
          <div class="col-md-5">
            <fieldset :disabled="motor.sw==1">
              <h5>赤外線リモコン受信</h5>
            </fieldset>
          </div>
          <div class="col-md-7">
            <slide-switch v-model="remoconRx.sw" :disabled="motor.sw==1" :buttons="buttonsOnOff"/>
          </div>
        </div>

        <div class="row well well-transparent" v-for="num of [0,1]" :key="'as-ad' + num">
          <div class="col-md-2">
            <h5>AD{{ num }}</h5>
          </div>
          <div class="col-md-3">
            <input class="func-name" type="text" v-model="ad[num].name" :disabled="ad[num].sw==0">
          </div>
          <div class="col-md-7">
            <slide-switch v-model="ad[num].sw" :buttons="buttonsOnOff"/>
            <select class="form-control select-menu btn-inline" v-model="ad[num].type" :disabled="ad[num].sw==0">
              <option v-for="item of adFuncTable" :key="'as-adFuncTable' + item.name" :value="item.type">{{ item.name }}</option>
            </select>
            <fieldset class="btn-inline" v-show="(ad[num].sw==1)&&(ad[num].type=='other')">
              <div class="item-label">offset</div>
              <input class="state" type="text" v-model="ad[num].offset">
              <div class="item-label">gain</div>
              <input class="state" type="text" v-model="ad[num].gain">
              <div class="item-label">unit</div>
              <input class="state" type="text" v-model="ad[num].unit">
            </fieldset>
          </div>
        </div>

        <div class="row well well-func">
          <div class="row">
            <div class="col-md-5">
              <fieldset :disabled="motor.sw==1">
                <h5>雨センサー</h5>
              </fieldset>
            </div>
            <div class="col-md-7">
              <slide-switch v-model="rainSensor.sw" :disabled="motor.sw==1" :buttons="buttonsOnOff"/>
            </div>
          </div>

          <hr>
          <div class="row" v-for="num of [0, 1]" :key="'as-gpio' + num">
            <div class="col-md-2">
              <fieldset :disabled="(rainSensor.sw==1)||(motor.sw==1)">
                <h5>GPIO{{ num }}</h5>
              </fieldset>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="gpio[num].name" :disabled="(rainSensor.sw==1)||(motor.sw==1)||(gpio[num].sw==0)" >
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="gpio[num].sw" :disabled="(rainSensor.sw==1)||(motor.sw==1)" :buttons="buttonsInOutOff"/>
              <slide-switch class="btn-inline" :disabled="(rainSensor.sw==1)||(motor.sw==1)||(gpio[num].sw!=2)" v-model="gpio[num].pull" :buttons="buttonsPlupNone"/>
              <select class="form-control select-menu btn-inline" v-model="gpio[num].type" :disabled="(rainSensor.sw==1)||(motor.sw==1)||(gpio[num].sw!=2)">
                <option v-for="item of gpioFuncTable" :key="'as-gpioFuncTable' + item.name" :value="item.type" :data-type="item.type">{{ item.name }}</option>
              </select>
              <fieldset class="btn-inline" v-show="(rainSensor.sw==0)&&(gpio[num].sw!=0)&&(motor.sw==0)&&(gpio[num].type=='other')">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="gpio[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="gpio[num].valueLabel[1]">
              </fieldset>
              <fieldset class="btn-inline" v-show="gpio[num].type=='motion'">
                <div class="item-label">遅延時間</div>
                <input class="state" type="text" v-model="gpio[num].delay">
                <div class="item-label">秒</div>
              </fieldset>
            </div>
          </div>
        </div>

        <div class="row well well-func" v-for="num of [0, 1]" :key="'as-ha' + num">
          <div class="row">
            <div class="col-md-2">
              <h5>HA端子{{ num }}</h5>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="ha[num].name" :disabled="ha[num].sw==0">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="ha[num].sw" :buttons="buttonsOnOff"/>
              <fieldset class="btn-inline" :disabled="ha[num].sw==0">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="ha[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="ha[num].valueLabel[1]">
              </fieldset>
            </div>
          </div>
          <hr>

          <div class="row">
            <div class="col-md-2">
              <fieldset :disabled="ha[num].sw==1">
                <h5>HAI{{ num }}</h5>
              </fieldset>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="hai[num].name" :disabled="(ha[num].sw==1)||(hai[num].sw==0)">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="hai[num].sw" :buttons="buttonsOnOff" :disabled="ha[num].sw==1"/>
              <fieldset class="btn-inline" :disabled="(ha[num].sw==1)||(hai[num].sw==0)">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="hai[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="hai[num].valueLabel[1]">
              </fieldset>
            </div>
          </div>

          <div class="row">
            <div class="col-md-2">
              <fieldset :disabled="ha[num].sw==1">
                <h5>HAO{{ num }}</h5>
              </fieldset>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="hao[num].name" :disabled="(ha[num].sw==1)||(hao[num].sw==0)">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="hao[num].sw" :buttons="buttonsOnOff" :disabled="ha[num].sw==1"/>
              <fieldset class="btn-inline" :disabled="(ha[num].sw==1)||(hao[num].sw==0)">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="hao[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="hao[num].valueLabel[1]">
              </fieldset>
            </div>
          </div>
        </div>

        <div class="row well well-func">
          <div class="row" v-if="ledTapeEnable">
            <div class="col-md-5">
              <h5>LED Tape</h5>
            </div>
            <div class="col-md-7">
              <slide-switch v-model="ledTape.sw" :buttons="buttonsOnOff"/>
            </div>
          </div>

          <div class="row">
            <div class="col-md-2">
              <fieldset :disabled="(motor.sw==1)||(ledTape.sw==1)">
                <h5>スイッチ制御</h5>
              </fieldset>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="sw.name" :disabled="(sw.sw==0)||(motor.sw==1)||(ledTape.sw==1)">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="sw.sw" :disabled="(motor.sw==1)||(ledTape.sw==1)" :buttons="buttonsOnOff"/>
              <div class="btn-inline">
                <fieldset :disabled="(sw.sw==0)||(motor.sw==1)||(ledTape.sw==1)">
                  <div class="item-label">動作時間</div>
                  <input class="state" type="text" v-model="sw.optionValue">
                  <div class="item-label">秒</div>
                </fieldset>
              </div>
            </div>
          </div>
          <hr>

          <div class="row" v-for="num of [0, 1, 2]" :key="'as-swio' + num">
            <div class="col-md-2">
              <fieldset :disabled="(sw.sw==1)||((num != 1)&&(motor.sw==1))||((num==1)&&(ledTape.sw==1))">
                <h5>SWIO{{ num }}</h5>
              </fieldset>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="swio[num].name" :disabled="(sw.sw==1)||(swio[num].sw==0)||((num != 1)&&(motor.sw==1))||((num==1)&&(ledTape.sw==1))">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="swio[num].sw" :buttons="buttonsOnOff" :disabled="(sw.sw==1)||((num != 1)&&(motor.sw==1))||((num==1)&&(ledTape.sw==1))"/>
              <fieldset class="btn-inline" :disabled="(sw.sw==1)||(swio[num].sw==0)||((num != 1)&&(motor.sw==1))||((num==1)&&(ledTape.sw==1))">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="swio[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="swio[num].valueLabel[1]">
              </fieldset>
            </div>
          </div>

        </div>
      </div>

      <div class="well" v-if="!isAVR">
        <div>
          <label>モジュール名</label>
          <input :class="{error:moduleNameAlert.length}" type="text" v-model="moduleName" @input="ModuleNameCheck">
          <h6>設置場所等、識別しやすい名前を付けてください。</h6>
          <h6 v-if="moduleNameAlert.length" class="error">{{ moduleNameAlert }}</h6>
        </div>

        <div class="row well well-transparent" v-for="num of [2,3]" :key="'as-adXbee' + num">
          <div class="col-md-2">
            <h5>AD{{ num }}</h5>
          </div>
          <div class="col-md-3">
            <input class="func-name" type="text" v-model="ad[num].name" :disabled="ad[num].sw==0">
          </div>
          <div class="col-md-7">
            <slide-switch v-model="ad[num].sw" :buttons="buttonsOnOff"/>
            <select class="form-control select-menu btn-inline" v-model="ad[num].type" :disabled="ad[num].sw==0">
              <option v-for="item of adFuncTable" :key="'as-adFuncXbee' + item.name" :value="item.type">{{ item.name }}</option>
            </select>
            <fieldset class="btn-inline" v-show="(ad[num].sw==1)&&(ad[num].type=='other')">
              <div class="item-label">offset</div>
              <input class="state" type="text" v-model="ad[num].offset">
              <div class="item-label">gain</div>
              <input class="state" type="text" v-model="ad[num].gain">
              <div class="item-label">unit</div>
              <input class="state" type="text" v-model="ad[num].unit">
            </fieldset>
          </div>
        </div>

        <div class="row well well-func">
          <div class="row" v-for="num of [2, 3]" :key="'as-gpi' + num">
            <div class="col-md-2">
              <h5>GPI{{ num }}</h5>
            </div>
            <div class="col-md-3">
              <input class="func-name" type="text" v-model="gpio[num].name" :disabled="gpio[num].sw==0">
            </div>
            <div class="col-md-7">
              <slide-switch class="btn-inline" v-model="gpio[num].sw" :buttons="buttonsOnOff"/>
              <slide-switch class="btn-inline" :disabled="!gpio[num].sw" v-model="gpio[num].pull" :buttons="buttonsPlupNone"/>
              <select class="form-control select-menu btn-inline" v-model="gpio[num].type" :disabled="!gpio[num].sw">
                <option v-for="item of gpioFuncTable" :key="'as-gpioFuncTableXbee' + item.name" :value="item.type" :data-type="item.type">{{ item.name }}</option>
              </select>
              <fieldset class="btn-inline" v-show="(gpio[num].sw!=0)&&(gpio[num].type=='other')">
                <div class="item-label">０</div>
                <input class="state" type="text" v-model="gpio[num].valueLabel[0]">
                <div class="item-label">１</div>
                <input class="state" type="text" v-model="gpio[num].valueLabel[1]">
              </fieldset>
            </div>
          </div>
        </div>

      </div>
      <div class="row">
        <div class="pull-right">
          <button class="btn btn-primary" type="button" @click="Submit">モジュール書き込み</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { dropdown } from 'vue-strap';
  import slideSwitch from './SlideSwitch.vue';
  export default {
    components: {
      dropdown,
      slideSwitch,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      /*
       option value : bit 31:0
         AVR  HB   ---- ---- : KPD  MTR  LED  RAIN : I2C  IRI  IRO  SW   : HA1  HA0  AD1  AD0
         PU1  SW2I SW1I SW0I : HA1I HA0I GPI1 GPI0 : PU0  SW2O SW1O SW0O : HA1O HA0O GPO1 GPO0
      */
      return {
        selectedModule: '',
        selectedModuleLabel: '設定するモジュール',
        configCommand: '',
        devices: [],
        alias: {},
        moduleName: '',
        moduleNameAlert: '',
        moduleType: '',
        ledTapeEnable: false,
        motorEnable: false,
        heartbeat: { sw: 1 },
        motor: { sw: 0 },
        remoconTx: { sw: 0 },
        remoconRx: { sw: 0 },
        ad: [
          { sw: 0, name: '', type: 'other', offset: 0, gain: 1, unit: '' },
          { sw: 0, name: '', type: 'other', offset: 0, gain: 1, unit: '' },
          { sw: 0, name: '', type: 'other', offset: 0, gain: 1, unit: '' },
          { sw: 0, name: '', type: 'other', offset: 0, gain: 1, unit: '' },
        ],
        rainSensor: { sw: 0 },
        ledTape: { sw: 0 },
        gpio: [
          { sw: 0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other', delay: 0 },
          { sw: 0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other', delay: 0 },
          { sw: 0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other' },
          { sw: 0, name: '', pull: 0, valueLabel: { '0': 'off', '1': 'on' }, type: 'other' },
        ],
        ha: [
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
        ],
        hai: [
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
        ],
        hao: [
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
        ],
        sw: { sw: 0, name: '', optionValue: 0 },
        swio: [
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
          { sw: 0, name: '', valueLabel: { '0': 'off', '1': 'on' }},
        ],
        adFuncTable: [
          { name: '温度センサー', type: 'temp', unit: '°C', offset: -500, gain: 0.1 },
          { name: '湿度センサー', type: 'humidity', unit: '%', offset: -500, gain: 0.045 },
          { name: '降雨センサー', type: 'rain', unit: '', offset: 0, gain: 0.024 },
          { name: '騒音センサー', type: 'noise', unit: '', offset: 0, gain: 1 },
          { name: 'バッテリー', type: 'battery', unit: 'mV', offset: 0, gain: 17.5 },
          { name: 'その他', type: 'other', unit: '', offset: 0, gain: 1 },
        ],
        gpioFuncTable: [
          { name: '人感センサー', type: 'motion', valueLabel: { '0': 'off', '1': 'on' }},
          { name: '報知機センサー', type: 'alarm', valueLabel: { '0': 'off', '1': 'on' }},
          { name: 'フラップセンサー', type: 'flap', valueLabel: { '0': 'off', '1': 'on' }},
          { name: 'その他', type: 'other', valueLabel: { '0': 'off', '1': 'on' }},
        ],
        buttonsOnOff: [{ label: 'on', val: 1 }, { label: 'off', val: 0 }],
        buttonsInOutOff: [{ label: 'in', val: 2 }, { label: 'out', val: 1 }, { label: 'off', val: 0 }],
        buttonsPlupNone: [{ label: 'plup', val: 1 }, { label: 'none', val: 0 }],
      };
    },
    computed: {
      moduleList() {
        const moduleList = [];
        for(const i in this.devices) {
          const dev = this.devices[i];
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
        return moduleList;
      },
      isAVR() {
        return (this.moduleType === 'HA/FC') ||
               (this.moduleType === 'RP/IR');
      },
    },
    mounted() {
      Socket.on('response', (msg) => {
        if(msg.data[0].command === this.configCommand) {
          if(msg.data[0].status === 'error') {
            Common.emit('toastr_error', this, msg.data[0].message);
          } else if(msg.data[0].status === 'ok') {
            Common.emit('toastr_success', this, '書き込み完了');
          }
        }
      });
      this.devices = Common.devices;
      Common.on('changeDevices', () => {
        this.devices = Common.devices;
      });
      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
      });
      this.ledTapeEnable = Common.systemConfig ? Common.systemConfig.led : false;
      this.motorEnable = Common.systemConfig ? Common.systemConfig.motor : false;
      Common.on('changeSystemConfig', () => {
        this.ledTapeEnable = Common.systemConfig.led;
        this.motorEnable = Common.systemConfig.motor;
      });
      Common.on('changeModule', (caller, device, name, option, param, type) => {
        if(caller !== this) this.SelectModule(device, name, option, param, type);
      });
    },
    methods: {
      Click(e) {
        if(!e.target.dataset.enable) return;

        const device = e.target.dataset.device;
        let option = 0xc0000000;
        let param = 0;
        let type = '';
        for(const dev of this.devices) {
          if(dev.device === device) {
            option = parseInt(dev.option, 16);
            param = dev.param;
            type = dev.type;
          }
        }
        this.SelectModule(device, e.target.dataset.name, option, param, type);
      },
      SelectModule(device, name, moduleOption, param, moduleType) {
        Common.emit('toastr_clear', this);
        this.selectedModuleLabel = device + ((name.length > 0) ? ':' : '') + name;
        this.selectedModule = device;
        this.moduleType = moduleType;
        this.moduleName = name;
        this.ModuleNameCheck();
        const moduleParam = param ? parseInt(param, 16) : 0;

        if(!this.isAVR) {
          for(let i = 2; i < 4; i++) {
            // AD
            this.ad[i].sw = (moduleOption >> (i - 2)) & 1;
            if(Common.alias[device] && Common.alias[device]['ad' + i]) {
              this.ad[i].name = Common.alias[device]['ad' + i].name;
              this.ad[i].type = Common.alias[device]['ad' + i].type;
            } else {
              this.ad[i].name = '';
              this.ad[i].type = '';
            }
            // GPIO
            this.gpio[i].sw = (moduleOption >> i) & 1;
            this.gpio[i].pull = (moduleOption >> (i + 2)) & 1;
            if(Common.alias[device] && Common.alias[device]['gpio' + i]) {
              this.gpio[i].name = Common.alias[device]['gpio' + i].name;
              this.gpio[i].type = Common.alias[device]['gpio' + i].type;
              if(this.gpio[i].type === 'other') {
                this.gpio[i].valueLabel = Common.alias[device]['gpio' + i].valueLabel || { '0': 'off', '1': 'on' };
              }
            } else {
              this.gpio[i].name = '';
              this.gpio[i].type = 'other';
              this.gpio[i].valueLabel = { '0': 'off', '1': 'on' };
            }
          }
          return;
        }

        this.heartbeat.sw = (moduleOption >> 30) & 1;
        this.remoconTx.sw = (moduleOption >> 21) & 1;
        this.remoconRx.sw = (moduleOption >> 22) & 1;

        // AD
        for(let i = 0; i < 2; i++) {
          this.ad[i].sw = (moduleOption >> (16 + i)) & 1;
          if(Common.alias[device] && Common.alias[device]['ad' + i]) {
            this.ad[i].name = Common.alias[device]['ad' + i].name;
            this.ad[i].type = Common.alias[device]['ad' + i].type;
          } else {
            this.ad[i].name = '';
            this.ad[i].type = '';
          }
        }
        // RAIN
        this.rainSensor.sw = (moduleOption >> 24) & 1;
        // LEDTape
        this.ledTape.sw = this.ledTapeEnable ? ((moduleOption >> 25) & 1) : 0;
        // Motor
        this.motor.sw = this.motorEnable ? ((moduleOption >> 26) & 1) : 0;
        if(Common.alias[device] && Common.alias[device].motor) {
          this.motor.optionValue = Common.alias[device].motor.optionValue;
        } else {
          this.motor.optionValue = this.motor.sw ? moduleParam : 1;
        }
        // GPIO
        for(let i = 0; i < 2; i++) {
          this.gpio[i].sw = ((moduleOption >> (0 + i)) & 1) || ((moduleOption >> (7 + i)) & 2);
          this.gpio[i].pull = (moduleOption >> (7 + 8 * i)) & 1;
          if(Common.alias[device] && Common.alias[device]['gpio' + i]) {
            this.gpio[i].name = Common.alias[device]['gpio' + i].name;
            this.gpio[i].type = Common.alias[device]['gpio' + i].type;
            this.gpio[i].delay = Common.alias[device]['gpio' + i].delay || ((this.gpio[i].type === 'motion') ? (moduleParam & ~3) : 0);
            if(this.gpio[i].type === 'other') {
              this.gpio[i].valueLabel = Common.alias[device]['gpio' + i].valueLabel || { '0': 'off', '1': 'on' };
            }
          } else {
            this.gpio[i].name = '';
            this.gpio[i].type = 'other';
            this.gpio[i].valueLabel = { '0': 'off', '1': 'on' };
          }
        }
        for(let i = 0; i < 2; i++) {
          // HA
          this.ha[i].sw = (moduleOption >> (18 + i)) & 1;
          if(Common.alias[device] && Common.alias[device]['ha' + i]) {
            this.ha[i].name = Common.alias[device]['ha' + i].name;
            this.ha[i].valueLabel = Common.alias[device]['ha' + i].valueLabel || { '0': 'off', '1': 'on' };
          } else {
            this.ha[i].name = '';
            this.ha[i].valueLabel = { '0': 'off', '1': 'on' };
          }
          // HAI
          this.hai[i].sw = (moduleOption >> (10 + i)) & 1;
          if(Common.alias[device] && Common.alias[device]['hai' + i]) {
            this.hai[i].name = Common.alias[device]['hai' + i].name;
            this.hai[i].valueLabel = Common.alias[device]['hai' + i].valueLabel || { '0': 'off', '1': 'on' };
          } else {
            this.hai[i].name = '';
            this.hai[i].valueLabel = { '0': 'off', '1': 'on' };
          }
          // HAO
          this.hao[i].sw = (moduleOption >> (2 + i)) & 1;
          if(Common.alias[device] && Common.alias[device]['hao' + i]) {
            this.hao[i].name = Common.alias[device]['hao' + i].name;
            this.hao[i].valueLabel = Common.alias[device]['hao' + i].valueLabel || { '0': 'off', '1': 'on' };
          } else {
            this.hao[i].name = '';
            this.hao[i].valueLabel = { '0': 'off', '1': 'on' };
          }
        }

        // SW
        this.sw.sw = (moduleOption >> 20) & 1;
        if(Common.alias[device] && Common.alias[device].sw) {
          this.sw.name = Common.alias[device].sw.name;
          this.sw.optionValue = Common.alias[device].sw.optionValue;
        } else {
          this.sw.name = '';
          this.sw.optionValue = this.sw.sw ? moduleParam : 0;
        }
        // SWIO
        for(let i = 0; i < 3; i++) {
          this.swio[i].sw = ((moduleOption >> (12 + i)) | (moduleOption >> (4 + i))) & 1;
          if(Common.alias[device] && Common.alias[device]['swio' + i]) {
            this.swio[i].name = Common.alias[device]['swio' + i].name;
            this.swio[i].valueLabel = Common.alias[device]['swio' + i].valueLabel || { '0': 'off', '1': 'on' };
          } else {
            this.swio[i].name = '';
            this.swio[i].valueLabel = { '0': 'off', '1': 'on' };
          }
        }
      },
      ModuleNameCheck() {
        if(this.moduleName.length === 0) {
          this.moduleNameAlert = 'モジュール名をいれて下さい。';
          return;
        }
        if(this.moduleName.length < 4) {
          this.moduleNameAlert = 'モジュール名が短かすぎます。4文字以上にして下さい。';
          return;
        }
        for(const i in this.alias) {
          if(i === this.selectedModule) continue;
          if(this.alias[i].name === this.moduleName) {
            this.moduleNameAlert = '同じモジュール名があります。他の名前にしてください。';
            return;
          }
        }
        this.moduleNameAlert = '';
      },
      Submit() {
        if(this.moduleNameAlert.length) return;
        if(!this.isAVR) {
          let newOption = 0;
          for(let i = 2; i < 4; i++) {
            newOption |= this.ad[i].sw << (i - 2);
            newOption |= this.gpio[i].sw << i;
            newOption |= this.gpio[i].pull << (i + 2);
          }
          const moduleAlias = {
            name: this.moduleName,
            option: newOption.toString(16),
          };

          for(let i = 2; i < 4; i++) {
            if(this.ad[i].sw) {
              moduleAlias['ad' + i] = {
                name: this.ad[i].name,
                type: this.ad[i].type,
              };
              if(this.ad[i].type === 'other') {
                moduleAlias['ad' + i].offset = this.ad[i].offset;
                moduleAlias['ad' + i].gain = this.ad[i].gain;
                moduleAlias['ad' + i].unit = this.ad[i].unit;
              } else {
                for(const j in this.adFuncTable) {
                  const item = this.adFuncTable[j];
                  if((item.type === this.ad[i].type) ||
                     (item.type === 'other')) {
                    moduleAlias['ad' + i].offset = item.offset;
                    moduleAlias['ad' + i].gain = item.gain;
                    moduleAlias['ad' + i].unit = item.unit;
                    break;
                  }
                }
              }
            }
            if(this.gpio[i].sw) {
              if(this.gpio[i].sw) {
                moduleAlias['gpio' + i] = {
                  name: this.gpio[i].name,
                  type: this.gpio[i].type,
                };
              }
              if(parseInt(this.gpio[i].sw) === 1) {
                moduleAlias['gpio' + i].type = 'out';
              }
              if(this.gpio[i].type === 'other') {
                moduleAlias['gpio' + i].valueLabel = this.gpio[i].valueLabel;
              } else {
                for(const j in this.gpioFuncTable) {
                  const item = this.gpioFuncTable[j];
                  if((item.type === this.gpio[i].type) ||
                     (item.type === 'other')) {
                    moduleAlias['gpio' + i].valueLabel = item.valueLabel;
                    break;
                  }
                }
              }
            }
          }

          this.$set(this.alias, this.selectedModule, moduleAlias);
          Common.emit('changeAlias', this);
          this.configCommand = 'config ' + newOption.toString(16) + ' W';
          Socket.emit('command',
            { type: 'command', device: this.selectedModule, command: this.configCommand });
          return;
        }

        let newOption = (1 << 31);
        newOption |= this.heartbeat.sw << 30;
        newOption |= this.motor.sw << 26;
        if(this.motor.sw) {
          this.ledTape.sw = 0;
          this.rainSensor.sw = 0;
          this.remoconRx.sw = 0;
          this.remoconTx.sw = 0;
          this.sw.sw = 0;
          this.swio[0].sw = 0;
          this.swio[2].sw = 0;
        }
        newOption |= this.ledTape.sw << 25;
        if(this.ledTape.sw) {
          this.rainSensor.sw = 0;
          this.gpio[0].sw = 0;
        }
        newOption |= this.rainSensor.sw << 24;
        if(this.rainSensor.sw) {
          this.gpio[0].sw = 0;
          this.gpio[1].sw = 0;
        }
        newOption |= this.remoconRx.sw << 22;
        newOption |= this.remoconTx.sw << 21;
        newOption |= this.sw.sw << 20;
        if(this.sw.sw) {
          this.swio[0].sw = 0;
          this.swio[1].sw = 0;
          this.swio[2].sw = 0;
        }
        for(let i = 0; i < 2; i++) {
          if(this.ha[i].sw) {
            this.hai[i].sw = 0;
            this.hao[i].sw = 0;
          }
          newOption |= this.ad[i].sw << (16 + i);
          newOption |= (parseInt(this.gpio[i].sw) === 1) ? (1 << (0 + i)) : 0;
          newOption |= (parseInt(this.gpio[i].sw) === 2) ? (1 << (8 + i)) : 0;
          newOption |= this.ha[i].sw << (18 + i);
          newOption |= this.hai[i].sw << (10 + i);
          newOption |= this.hao[i].sw << (2 + i);
          newOption |= this.gpio[i].pull << (7 + 8 * i);
        }
        for(let i = 0; i < 3; i++) {
          newOption |= this.swio[i].sw << (12 + i);
          newOption |= this.swio[i].sw << (4 + i);
        }
        if(newOption < 0) newOption += Math.pow(2, 32);

        const moduleAlias = {
          name: this.moduleName,
          option: newOption.toString(16),
        };
        let param = '';
        if(this.motor.sw) {
          moduleAlias['motor'] = {
            name: '',
            optionValue: this.motor.optionValue,
          };
          if(!this.motor.optionValue || (this.motor.optionValue === '')) {
            this.motor.optionValue = 1;
          }
          param = this.motor.optionValue;
        } else if(this.sw.sw) {
          moduleAlias['sw'] = {
            name: this.sw.name,
            optionValue: this.sw.optionValue,
            valueLabel: { '0': 'open', '1': 'stop', '2': 'close' },
          };
          if(!this.sw.optionValue || (this.sw.optionValue === '')) {
            this.sw.optionValue = 0;
          }
          param = this.sw.optionValue;
        } else {
          let motionBit = 0;
          let delay = -1;
          for(let i = 0; i < 2; i++) {
            if((parseInt(this.gpio[i].sw) === 2) && (this.gpio[i].type === 'motion')) {
              if(this.gpio[i].delay <= 0) this.gpio[i].delay = '300';
              delay = parseInt(this.gpio[i].delay) & ~3;
              motionBit |= (1 << i);
            }
          }
          if(delay > 0) {
            delay = delay & ~3 | motionBit;
            param = delay.toString();
          }
        }

        if(this.ledTape.sw) {
          moduleAlias['led'] = {
            name: '',
          };
        }

        for(let i = 0; i < 3; i++) {
          if(this.swio[i].sw) {
            moduleAlias['swio' + i] = {
              name: this.swio[i].name,
              valueLabel: this.swio[i].valueLabel,
            };
          }
          if(i === 2) continue;

          if(this.ad[i].sw) {
            moduleAlias['ad' + i] = {
              name: this.ad[i].name,
              type: this.ad[i].type,
            };
            if(this.ad[i].type === 'other') {
              moduleAlias['ad' + i].offset = this.ad[i].offset;
              moduleAlias['ad' + i].gain = this.ad[i].gain;
              moduleAlias['ad' + i].unit = this.ad[i].unit;
            } else {
              for(const j in this.adFuncTable) {
                const item = this.adFuncTable[j];
                if((item.type === this.ad[i].type) ||
                   (item.type === 'other')) {
                  moduleAlias['ad' + i].offset = item.offset;
                  moduleAlias['ad' + i].gain = item.gain;
                  moduleAlias['ad' + i].unit = item.unit;
                  break;
                }
              }
            }
          }
          if(this.gpio[i].sw) {
            if(parseInt(this.gpio[i].sw) === 1) {
              moduleAlias['gpio' + i] = {
                name: this.gpio[i].name,
                type: 'out',
              };
            } else {
              moduleAlias['gpio' + i] = {
                name: this.gpio[i].name,
                type: this.gpio[i].type,
                delay: (this.gpio[i].type === 'motion') ? this.gpio[i].delay : 0,
              };
            }
            if((this.gpio[i].type === 'other') || (parseInt(this.gpio[i].sw) === 1)) {
              moduleAlias['gpio' + i].valueLabel = this.gpio[i].valueLabel;
            } else {
              for(const j in this.gpioFuncTable) {
                const item = this.gpioFuncTable[j];
                if((item.type === this.gpio[i].type) ||
                   (item.type === 'other')) {
                  moduleAlias['gpio' + i].valueLabel = item.valueLabel;
                  break;
                }
              }
            }
          }
          if(this.ha[i].sw) {
            moduleAlias['ha' + i] = {
              name: this.ha[i].name,
              valueLabel: this.ha[i].valueLabel,
            };
          }
          if(this.hai[i].sw) {
            moduleAlias['hai' + i] = {
              name: this.hai[i].name,
              valueLabel: this.hai[i].valueLabel,
            };
          }
          if(this.hao[i].sw) {
            moduleAlias['hao' + i] = {
              name: this.hao[i].name,
              valueLabel: this.hao[i].valueLabel,
            };
          }
        }

        this.$set(this.alias, this.selectedModule, moduleAlias);
        Common.emit('changeAlias', this);
        this.configCommand = ('config ' + newOption.toString(16) + ' F ' + param).trim();
        Socket.emit('command',
          { type: 'command', device: this.selectedModule, command: this.configCommand });
        let moduleType = null;
        for(const dev of this.devices) {
          if(dev.device === this.selectedModule) {
            moduleType = dev.type;
            break;
          }
        }
        Common.emit('changeModule', this, this.selectedModule, this.moduleName, newOption.toString(16), param, moduleType);
      },
    },
  };
</script>

<style scoped>
  .select-menu {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:12px;
    margin: 0px;
    padding:0px;
    text-align: center;
    width: 140px;
    height:20px;
    line-height:20px
  }

  .module-list, .moduleLabel {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:14px;
    text-align: left;
  }

  .module-list li a {
    padding: 3px 10px;
  }

  .well-func {
    height:85%;
    width:100%;
    padding:0.7% 0 0.3% 0;
    margin: 0.5% 0;
    background-color: rgba(255,255,255,0);
  }

  .well hr {
    margin: 0.5%;
    border-top-width: 2px;
  }

  fieldset:disabled  {
    color: #aaa;
  }

  .state {
    width:5vw;
  }

  .func-name {
    width:12vw;
  }

  .item-label {
    display:inline;
    margin: 0vh 0.2vw 0vh 0.5vw;
  }

  .btn-inline {
    display:inline-block;
    margin-left: 0.2vw;
  }
</style>

