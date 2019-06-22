<template>
  <ElContainer>
    <ElAside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>基本設定</h4>
      <br>
      <div class="module-image no-mobile">
        <img src="../images/HB-6.png" alt="GL-1100" width="90%">
      </div>
      <br>
      <ElSelect v-model="selectedModule" placeholder="設定するモジュール" @change="Select">
        <ElOption v-for="module of moduleList" :key="'bs-moduleList' + module.name" :disabled="!module.enable" :label="module.label" :value="module.device" />
      </ElSelect>
    </ElAside>
    <ElMain v-show="selectedModule!=''">
      <ElForm :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
        <ElFormItem label="モジュール名" prop="moduleName">
          <ElTooltip placement="top" content="設置場所等、識別しやすい名前を付けてください" effect="light" open-delay="500">
            <ElInput type="text" v-model="ruleForm.moduleName" />
          </ElTooltip>
        </ElFormItem>

        <ElFormItem label="機能設定" prop="selectedType">
          <ElRadioGroup v-model="ruleForm.selectedType">
            <ElRow v-for="(item, idx) of typeTable" :key="'bs-typeTable' + idx">
              <ElTooltip placement="right" content="子機のタイプを選択してください" effect="light" open-delay="500">
                <ElRadio :label="idx" class="item-label" border>
                  {{ item.name }}
                </ElRadio>
              </ElTooltip>
            </ElRow>
          </ElRadioGroup>
        </ElFormItem>

        <ElRow v-for="(item, idx) of funcTable" :key="'bs-funcTable' + idx" v-show="ItemCheck(idx)">
          <ElCol :span="(item.option == null) ? 20 : 12">
            <ElFormItem :label="item.name">
              <ElTooltip placement="top" content="子機の機能に名前をつけることができます(option)" effect="light" open-delay="500">
                <ElInput type="text" v-model="item.value" />
              </ElTooltip>
            </ElFormItem>
          </ElCol>
          <div v-if="(item.option != null)">
            <ElCol span="8" offset="1">
              <ElFormItem v-show="item.option != null" :label="item.option">
                <ElTooltip placement="top" :content="item.optionTooltip" effect="light" open-delay="500">
                  <ElInput type="text" v-model="item.optionValue" />
                </ElTooltip>
              </ElFormItem>
            </ElCol>
            <ElCol span="3">
              <label class="option-unit">
                {{ item.optionUnit }}
              </label>
            </ElCol>
          </div>
        </ElRow>
      </ElForm>
      <ElRow type="flex" justify="end">
        <ElButton type="primary" :disabled="!rulesValid" @click="Submit">
          モジュール書き込み
        </ElButton>
      </ElRow>
    </ElMain>
  </ElContainer>
</template>

<script>
  import { Tooltip, Select, Option, Form, FormItem, Input, Radio, RadioGroup } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/radio.css';
  import 'element-ui/lib/theme-chalk/radio-group.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElSelect: Select,
      ElOption: Option,
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
      ElRadio: Radio,
      ElRadioGroup: RadioGroup,
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
        devices: [],
        alias: {},
        configCommand: '',
        typeTable: [
          { funcId: 'c0040000', funcSel: ['haOpenClose'], name: 'GL-1210 HA端子制御（電気錠等 open/close）' },
          { funcId: 'c0040000', funcSel: ['haOnOff'], name: 'GL-1210 HA端子制御（給湯、床暖房等 on/off）' },
          { funcId: 'c0100000', funcSel: ['sw'], name: 'GL-1220 弱電スイッチ制御（電動シャッター、電動窓、電動カーテン等）' },
          { funcId: 'c0600000', funcSel: [], name: 'GL-1230 赤外線リモコン送受信' },
          { funcId: 'c0030000', funcSel: ['temp', 'humidity'], name: 'GL-1240 温度・湿度センサー' },
          { funcId: 'c0250180', funcSel: ['temp', 'haOnOff', 'flap'], name: 'GL-1250 エアコン制御' },
          { funcId: 'c0638300', funcSel: ['temp', 'alarm', 'motion', 'noise'], name: 'GL-1260 火災警報器、人感、温度、騒音センサー、赤外線リモコン送受信' },
        ],
        funcTable: [],
        ruleForm: {
          moduleName: '',
          selectedType: -1,
        },
        rules: {
          moduleName: [
            { required: true, min: 4, message: 'モジュール名を4文字以上で入れてください。', trigger: [ 'blur', 'change' ] },
            { validator: this.ValidateModuleName.bind(this), trigger: [ 'blur', 'change' ] },
          ],
          selectedType: [
            { type: 'number', min: 0, message: '選択してください', trigger: 'change' },
          ],
        },
        ruleValid: {
          moduleName: true,
          selectedType: true,
        },
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
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
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
      Select(device) {
        for(const module of this.moduleList) {
          if(device === module.device) return this.SelectModule(module.device, module.name);
        }
      },
      SelectModule(device, name) {
        Common.emit('toastr_clear', this);
        this.selectedModuleLabel = device + ((name.length > 0) ? ':' : '') + name;

        this.funcTable = [
          { name: '温度センサー', type: 'temp', unit: '°C', func: 'ad0', offset: -500, gain: 0.1 },
          { name: '湿度センサー', type: 'humidity', unit: '%', func: 'ad1', offset: -500, gain: 0.045 },
          { name: '降雨センサー', type: 'rain', unit: '', func: 'ad1', offset: 0, gain: 0.024 },
          { name: '騒音センサー', type: 'noise', unit: '', func: 'ad1', offset: 0, gain: 1 },
          { name: '人感センサー', type: 'motion', label0: 'off', label1: 'on', func: 'gpio0', fixedOptionValue: 301 },
          { name: '報知機センサー', type: 'alarm', label0: 'off', label1: 'on', func: 'gpio1' },
          { name: 'フラップセンサー', type: 'flap', label0: 'off', label1: 'on', func: 'gpio0' },
          { name: 'HA端子', type: 'haOnOff', label0: 'off', label1: 'on', func: 'ha0' },
          { name: 'HA端子', type: 'haOpenClose', label0: 'open', label1: 'close', func: 'ha0' },
          { name: '弱電スイッチ', type: 'sw', label0: 'open', label1: 'stop', label2: 'close', func: 'sw', option: '動作時間', optionUnit: '秒', optionTooltip: '窓やシャッターの動作時間を設定します' },
        ];

        this.selectedModule = device;
        this.ruleForm.moduleName = name;
        if(this.alias[device] && this.alias[device].basicSelect) this.ruleForm.selectedType = parseInt(this.alias[device].basicSelect);
        if((this.ruleForm.selectedType < 0) || (this.typeTable.length <= this.ruleForm.selectedType)) this.ruleForm.selectedType = -1;
        let type = '';
        if(this.ruleForm.selectedType >= 0) type = this.typeTable[this.ruleForm.selectedType];
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
        this.$refs.ruleForm.validate(() => {});
      },
      ValidateModuleName(rule, value, callback) {
        for(const i in this.alias) {
          if(i === this.selectedModule) continue;
          if(this.alias[i].name === value) {
            return callback(new Error('同じモジュール名があります。他の名前にしてください。'));
          }
        }
        return callback();
      },
      ItemCheck(idx) {
        if(!this.ruleForm.selectedType || (this.ruleForm.selectedType < 0)) return false;
        for(const t in this.typeTable[this.ruleForm.selectedType].funcSel) {
          if(this.typeTable[this.ruleForm.selectedType].funcSel[t] === this.funcTable[idx].type) return true;
        }
        return false;
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      Submit() {
        this.$refs.ruleForm.validate((valid) => {
          if(!valid) return;
          if(this.selerctedType < 0) return;
          const type = this.typeTable[this.ruleForm.selectedType];
          if(!type) return;

          const moduleAlias = {
            name: this.ruleForm.moduleName,
            basicSelect: this.ruleForm.selectedType,
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
          Common.emit('changeModule', this, this.selectedModule, this.ruleForm.moduleName, parseInt(type.funcId, 16), param, moduleType);
        });
      },
    },
  };
</script>

<style scoped>
  .item-label {
    margin: 0.5vh 0;
  }
  .option-unit {
    line-height: 28px;
  }
</style>


