<template>
  <ElContainer>
    <ElAside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>ペアリング</h4>
      <br>
      <div class="module-image no-mobile">
        <img src="../images/HB-6.png" alt="GL-1100" width="90%">
      </div>
    </ElAside>
    <ElMain>
      <ElForm :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="20%" label-position="left" @validate="Validated" @submit.native.prevent="ExecutePairing">
        <ElFormItem label="モジュール名" prop="moduleName">
          <ElTooltip placement="top" content="設置場所等、識別しやすい名前を付けてください" effect="light" open-delay="500">
            <ElInput type="text" v-model="ruleForm.moduleName" @change="ExecutePairing" />
          </ElTooltip>
        </ElFormItem>
      </ElForm>
      <div class="vertical-space" />
      <ElRow>
        <ElCol span="14" offset="5">
          <ElProgress :show-text="false" :stroke-width="18" :percentage="progress" :class="{'progress-striped':progressing}" />
        </ElCol>
        <ElCol span="4" offset="1">
          <ElButton type="primary" :disabled="progressing || !rulesValid" @click="ExecutePairing">
            ペアリング
          </ElButton>
        </ElCol>
      </ElRow>
      <br>
      <ElRow>
        <ElCol span="19" offset="5">
          <h5 class="error" v-if="error.length > 0">
            子機のエラーが発生しています。<br>
            {{ error }}
          </h5>
          <h5 v-else>
            {{ moduleLabel }}
          </h5>
        </ElCol>
      </ElRow>
    </ElMain>
  </ElContainer>
</template>

<script>
  import { Tooltip, Form, FormItem, Input, Progress } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/progress.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
      ElProgress: Progress,
    },
    data() {
      return {
        progress: 0,
        moduleLabel: '',
        error: '',
        option: 0xc0000000,
        param: 0,
        configCommand: '',
        newDevice: { name: '', device: '' },
        ruleForm: {
          moduleName: '',
        },
        rules: {
          moduleName: [
            { required: true, min: 4, message: 'モジュール名を4文字以上で入れてください。', trigger: [ 'blur', 'change' ] },
            { validator: this.ValidateModuleName.bind(this), trigger: [ 'blur', 'change' ] },
          ],
        },
        ruleValid: {
          moduleName: false,
        },
      };
    },
    computed: {
      progressing() {
        return (this.progress !== 0) && (this.progress !== 100);
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
        if((msg.data[0].command !== this.configCommand) &&
           (msg.data[0].command !== 'moduleauth')) return;

        if(msg.data[0].status === 'error') {
          Common.emit('toastr_error', this, msg.data[0].message);
          this.error = msg.data[0].message;
          this.progress = 0;
          return;
        }

        if(msg.data[0].status === 'ok') {
          Common.emit('toastr_success', this, 'ペアリング完了');
          this.progress = 100;
          this.moduleLabel = this.newDevice.name + ':' + this.newDevice.device;
          Common.emit('changeModule', this, this.newDevice.device, this.newDevice.name, this.option.toString(16), this.param.toString(16), 'HA/FC');
          this.ruleForm.moduleName = '';
        }

        const message = msg.data[0].message;

        if(message.search(/HA module XBee Info/) >= 0) {
          const str = message.match(/SerialNumber :.*/);
          if(str) {
            const dev = str[0].replace(/^.*-/, '');
            if(dev) {
              Common.alias[dev] = { name: this.ruleForm.moduleName };
              this.newDevice = { name: this.ruleForm.moduleName, device: dev };
              Common.emit('changeAlias', this);
            }
          }
          Common.emit('toastr_info', this, 'デバイス確認完了');
          this.progress = 10;
          return;
        }

        if(message.search(/Start module firmware update/) >= 0) {
          Common.emit('toastr_info', this, 'ファームウェア更新開始');
          this.progress = 20;
          setTimeout(() => {
            Common.emit('toastr_info', this, 'ファームウェア更新中');
            this.progress = 30;
          }, 5000);
          return;
        }

        if(message.search(/HA module XBee update/) >= 0) {
          Common.emit('toastr_info', this, 'XBee更新開始');
          this.progress = 40;
          setTimeout(() => {
            Common.emit('toastr_info', this, 'XBee更新中');
            this.progress = 45;
            setTimeout(() => {
              Common.emit('toastr_info', this, 'XBee更新中');
              this.progress = 50;
            }, 10000);
          }, 10000);
          return;
        }

        if(message.search(/Wait Coordinator/) >= 0) {
          const n = parseInt(message.replace(/^.*bring up /, ''));
          if(n === 0) {
            Common.emit('toastr_info', this, '無線接続開始');
          }
          this.progress = 60 + n;
          return;
        }

        if(message.search(/Bootup HA-Micro/) >= 0) {
          Common.emit('toastr_info', this, 'マイコン起動');
          this.progress = 85;
          return;
        }

        if(message.search(/PairingSequence/) >= 0) {
          Common.emit('toastr_info', this, 'ペアリング中');
          this.progress = 90;
          return;
        }

        if(message.search(/Start validate module/) >= 0) {
          Common.emit('toastr_info', this, 'モジュール動作確認');
          this.progress = 95;
          return;
        }
      });

      Common.on('changeDevices', () => {
        for(const dev of Common.devices) {
          if(dev.device === 'pairing') {
            if(dev.state !== 'connect') {
              this.progress = 0;
              this.moduleLabel = '';
            }
            break;
          }
        }
      });
    },
    methods: {
      ValidateModuleName(rule, value, callback) {
        for(const i in Common.alias) {
          if(Common.alias[i].name === value) {
            return callback(new Error('同じモジュール名があります。他の名前にしてください。'));
          }
        }
        return callback();
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      ExecutePairing() {
        if(!this.rulesValid) return;
        Common.emit('toastr_clear', this);
        this.error = '';
        Common.emit('toastr_info', this, 'モジュール接続開始');
        this.progress = 5;

        this.configCommand = ('config ' + this.option.toString(16) + ' F ' + this.param).trim();
        Socket.emit('command',
          { type: 'command', device: '0', command: this.configCommand });
      },
    },
  };
</script>

<style scoped>
  .vertical-space {
    margin-top: 10vh;
  }
</style>

