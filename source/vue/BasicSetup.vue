<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3 scrollable">
      <br>
      <h4>基本設定</h4>
      <br>
      <div class="module-image">
        <img src="../images/HB-6.png" alt="GL-1100" width="200px" >
      </div>
      <br>

      <dropdown class="moduleLabel" :text="selectedModuleLabel">
        <li v-for="module of moduleList" :key="module.name" class="module-list" :class="{disabled:!module.enable}" >
          <a href="#" :data-device="module.device" :data-name="module.name" :data-enable="module.enable" @click="Click" :disabled="!module.enable">
            {{ module.label }}
          </a>
        </li>
      </dropdown>
    </div>

    <div v-show="selectedModule!=''" class="col-sm-9 col-md-9 scrollable">
      <br>
      <div class="well">
        <div>
          <label>モジュール名</label>
          <input :class="{error:moduleNameAlert.length}" type="text" v-model="moduleName" @input="ModuleNameCheck">
          <h6>設置場所等、識別しやすい名前を付けてください。</h6>
          <h6 v-if="moduleNameAlert.length" class="error">{{ moduleNameAlert }}</h6>
        </div>

        <br>
        <h5>機能設定</h5>
        <div class="form-group" id="basicFuncSel">
          <div class="row" v-for="(item, idx) of typeTable" :key="idx" v-show="item.name != ''">
            <div class="col-sm-offset-1 col-sm-10">
              <radio :selected-value="idx" v-model="selectedType" type="primary">
                {{ item.name }}
              </radio>
            </div>
          </div>
        </div>

        <div v-for="(item, idx) of funcTable" :key="idx" v-show="ItemCheck(idx)">
          <div class="row well well-transparent">
            <div class="col-md-3">
              <h5>{{ item.name }}</h5>
            </div>
            <div class="col-md-4">
              <input class="func-name" type="text" v-model="item.value">
            </div>
            <div v-show="item.option != null">
              <div class="item-label">
                {{ item.option }}
              </div>
              <input class="option-param" type="text" v-model="item.optionValue">
              <div class="item-label">
                {{ item.optionUnit }}
              </div>
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
  import { radio, dropdown } from 'vue-strap';

  export default {
    components: {
      radio,
      dropdown,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedModule: '',
        selectedModuleLabel: '設定するモジュール',
        moduleName: '',
        moduleNameAlert: '',
        selectedType: -1,
        devices: [],
        alias: {},
        configCommand: '',
        typeTable: [
          { funcId: '00000000', funcSel: [], name: '' },
          { funcId: 'c0040000', funcSel: ['haOpenClose'], name: 'GL-1210 HA端子制御（電気錠等 open/close）' },
          { funcId: 'c0040000', funcSel: ['haOnOff'], name: 'GL-1210 HA端子制御（給湯、床暖房等 on/off）' },
          { funcId: 'c0100000', funcSel: ['sw'], name: 'GL-1220 弱電スイッチ制御（電動シャッター、電動窓、電動カーテン等）' },
          { funcId: 'c0600000', funcSel: [], name: 'GL-1230 赤外線リモコン送受信' },
          { funcId: 'c0030000', funcSel: ['temp', 'humidity'], name: 'GL-1240 温度・湿度センサー' },
          { funcId: 'c0250180', funcSel: ['temp', 'haOnOff', 'flap'], name: 'GL-1250 エアコン制御' },
          { funcId: 'c0018380', funcSel: ['alarm', 'motion', 'noise'], name: 'GL-1260 火災警報器、人感、騒音センサー' },
        ],
        funcTable: [],
      };
    },
    computed: {
      moduleList() {
        const moduleList = [];
        for(let i = 0; i < this.devices.length; i++) {
          const dev = this.devices[i];
          if(dev.device === 'pairing') continue;
          let name = '';
          if(dev.device in this.alias) name = this.alias[dev.device].name;
          moduleList.push({
            device: dev.device,
            name: name,
            label: dev.device + ((name.length > 0) ? ':' : '') + name,
            enable: ((dev.state === 'alive') && ((parseInt(dev.option, 16) & (1 << 31)) !== 0)),
          });
        }
        return moduleList;
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
      this.devices = Common.devices || [];
      Common.on('changeDevices', () => {
        this.devices = Common.devices || [];
      });
      this.alias = Common.alias || {};
      Common.on('changeAlias', () => {
        this.alias = Common.alias || {};
      });
      Common.on('changeModule', (caller, device, name) => {
        if(caller !== this) this.SelectModule(device, name);
      });
    },
    methods: {
      Click(e) {
        if(!e.target.dataset.enable) return;
        this.SelectModule(e.target.dataset.device, e.target.dataset.name);
      },
      SelectModule(device, name) {
        Common.emit('toastr_clear', this);
        this.selectedModuleLabel = device + ((name.length > 0) ? ':' : '') + name;

        this.funcTable = [
          { name: '温度センサー', type: 'temp', unit: '°C', func: 'ad0', offset: -500, gain: 0.1 },
          { name: '湿度センサー', type: 'humidity', unit: '%', func: 'ad1', offset: -500, gain: 0.045 },
          { name: '降雨センサー', type: 'rain', unit: '', func: 'ad1', offset: 0, gain: 0.024 },
          { name: '騒音センサー', type: 'noise', unit: '', func: 'ad0', offset: 0, gain: 1 },
          { name: '人感センサー', type: 'motion', label0: 'off', label1: 'on', func: 'gpio1', fixedOptionValue: 302 },
          { name: '報知機センサー', type: 'alarm', label0: 'off', label1: 'on', func: 'gpio0' },
          { name: 'フラップセンサー', type: 'flap', label0: 'off', label1: 'on', func: 'gpio0' },
          { name: 'HA端子', type: 'haOnOff', label0: 'off', label1: 'on', func: 'ha0' },
          { name: 'HA端子', type: 'haOpenClose', label0: 'open', label1: 'close', func: 'ha0' },
          { name: '弱電スイッチ', type: 'sw', label0: 'open', label1: 'stop', label2: 'close', func: 'sw', option: '動作時間', optionUnit: '秒' },
        ];

        this.selectedModule = device;
        this.moduleName = name;
        this.ModuleNameCheck();
        if(this.alias[device] && this.alias[device].basicSelect) this.selectedType = parseInt(this.alias[device].basicSelect);
        const type = this.typeTable[this.selectedType];
        if(type) {
          for(const j in type.funcSel) {
            const item = type.funcSel[j];
            for(const i in this.funcTable) {
              if(this.funcTable[i].type === item) {
                const f = this.alias[device][this.funcTable[i].func];
                if(f) {
                  this.funcTable[i].value = f.name;
                  this.funcTable[i].optionValue = f.optionValue;
                }
                break;
              }
            }
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
      ItemCheck(idx) {
        if(!this.selectedType || (this.selectedType < 0)) return false;
        for(const t in this.typeTable[this.selectedType].funcSel) {
          if(this.typeTable[this.selectedType].funcSel[t] === this.funcTable[idx].type) return true;
        }
        return false;
      },
      Submit() {
        if(this.moduleNameAlert.length) return;

        const type = this.typeTable[this.selectedType];
        if(!type) return;

        const moduleAlias = {
          name: this.moduleName,
          basicSelect: this.selectedType,
          option: type.funcId,
        };
        let param = '';
        for(const j in type.funcSel) {
          const item = type.funcSel[j];
          for(const i in this.funcTable) {
            if(this.funcTable[i].type === item) {
              const f = this.funcTable[i];
              moduleAlias[f.func] = {
                name: f.value,
                valueLabel: {},
                type: f.type,
              };
              if((f.func === 'ad0') || (f.func === 'ad1')) {
                moduleAlias[f.func].offset = f.offset;
                moduleAlias[f.func].gain = f.gain;
                moduleAlias[f.func].unit = f.unit;
              } else {
                moduleAlias[f.func].valueLabel = {};
                if(f.label0) moduleAlias[f.func].valueLabel['0'] = f.label0;
                if(f.label1) moduleAlias[f.func].valueLabel['1'] = f.label1;
                if(f.label2) moduleAlias[f.func].valueLabel['2'] = f.label2;
              }
              if(f.type === 'motion') {
                let p = 300;
                if(f.func === 'gpio0') p |= (1 << 0);
                if(f.func === 'gpio1') p |= (1 << 1);
                param = ' ' + p.toString();
              }
              if(f.optionValue) {
                moduleAlias[f.func].optionValue = f.optionValue;
                param = ' ' + f.optionValue;
              }
              break;
            }
          }
        }
        this.$set(this.alias, this.selectedModule, moduleAlias);
        Common.emit('changeAlias', this);
        this.configCommand = ('config ' + type.funcId + ' F' + param).trim();
        Socket.emit('command',
          { type: 'command', device: this.selectedModule, command: this.configCommand });
        let moduleType = null;
        for(const dev of this.devices) {
          if(dev.device === this.selectedModule) {
            moduleType = dev.type;
            break;
          }
        }
        Common.emit('changeModule', this, this.selectedModule, this.moduleName, parseInt(type.funcId, 16), param, moduleType);
      },
    },
  };
</script>

<style scoped>
  .module-list, .moduleLabel {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:14px;
    text-align: left;
  }

  .module-list li a {
    padding: 3px 10px;
  }

  .option-param {
    width:5vw;
  }

  .func-name {
    width:12vw;
  }

  .item-label {
    display:inline;
    margin: 0vh 0.2vw 0vh 0.5vw;
  }
</style>


