<template>
  <ElContainer>
    <ElAside :width="$root.$el.clientWidth > 768 ? '15%' : '90%'">
      <h4>リンク機器</h4>
      <br>
    </ElAside>
    <ElMain>
      <div v-if="hueBridges && (hueBridges.length > 0)" class="well">
        <h4>Hue</h4>
        <ElRow v-for="bridge of hueBridges" :key="'link-hueBridges' + bridge.id">
          <ElRow>
            <label class="label">
              Bridge {{ bridge.id }}
            </label>
            <div class="pull-right">
              <ElButton v-if="bridge.state ==0" @click="HuePairing(bridge.id)" type="primary">
                ペアリング
              </ElButton>
              <ElButton v-if="bridge.state>=1" :disabled="bridge.state==2" @click="HueSearch(bridge.id)" type="primary">
                新規ライトのサーチ
              </ElButton>
              <ElButton v-if="bridge.state>=1" :disabled="bridge.state==2" @click="HueTouchLink(bridge.id)" type="primary">
                TouchLinkサーチ
              </ElButton>
            </div>
          </ElRow>
          <ElRow v-if="hueProgress[bridge.id] > 0">
            <ElCol span="12" offset="4">
              <ElProgress :show-text="false" :stroke-width="18" :percentage="hueProgress[bridge.id]" :class="{'progress-striped':HueProgressing(bridge.id)}" />
            </ElCol>
          </ElRow>
          <ElRow v-if="bridge.message && (bridge.message.length > 0)">
            <ElCol span="12" offset="4">
              <h6>{{ bridge.message }}</h6>
            </ElCol>
          </ElRow>
          <ElRow v-for="(light,idx) of bridge.lights" :key="'link-lights' + idx">
            <ElCol span="12" offset="4">
              <ElInput type="text" v-model="light.name" />
            </ElCol>
            <ElCol span="8">
              <div class="pull-right">
                <ElButton @click="LightFlash(bridge.id, idx)" type="primary">
                  フラッシュ
                </ElButton>
                <ElButton @click="DeleteLight(bridge.id, idx)" type="danger">
                  削除
                </ElButton>
              </div>
            </ElCol>
          </ElRow>
        </ElRow>
        <ElRow>
          <ElButton class="pull-right" type="primary" @click="SubmitHue">
            設定
          </ElButton>
        </ElRow>
      </div>

      <div v-if="hap" class="well">
        <h4>HAP Device</h4>
        <ElRow>
          <ElCol span="6" offset="1">
            <img src="../images/home.png" alt="home" width="60px">
          </ElCol>
          <ElCol span="15" offset="1">
            <QrcodeVue class="hap-qr" :value="hapSetupURI" />
            <div class="well well-homekit">
              {{ hapPin }}
            </div>
          </ElCol>
        </ElRow>
        <br>
        <ElRow>
          <ElCol span="6" offset="1">
            <H5>HAPデバイスID</h5>
          </ElCol>
          <ElCol span="7" offset="1">
            <ElInput type="text" v-model="hapDeviceId" />
          </ElCol>
        </ElRow>
        <ElRow>
          <ElButton class="pull-right" type="primary" @click="SubmitHAP">
            設定
          </ElButton>
        </ElRow>
      </div>

      <div v-if="smartMeterEnable && smartMeterConnect" class="well">
        <h4>SmartMeter</h4>
        <ElRow>
          <ElCol span="6" offset="1">
            <H5>Wi-SUNドングル</h5>
          </ElCol>
          <ElCol span="15" offset="1">
            <ElSelect v-model="smartMeterAdapter">
              <ElOption v-for="item of smartMeterAdapters" :key="'link-smartMeterAdapters' + item.id" :label="item.name" :value="item.id">
                {{ item.name }}
              </ElOption>
            </ElSelect>
          </ElCol>
        </ElRow>
        <ElRow>
          <ElCol span="6" offset="1">
            <H5>電力計ＩＤ</h5>
          </ElCol>
          <ElCol span="15" offset="1">
            <ElInput v-for="(id, idx) in smartMeterID" :key="'link-smartMeterID' + idx" class="smart-meter-id" type="text" :class="SmartMeterIDValid(idx)" v-model="smartMeterID[idx]" />
          </ElCol>
        </ElRow>
        <ElRow>
          <ElCol span="6" offset="1">
            <H5>電力計パスワード</h5>
          </ElCol>
          <ElCol span="15" offset="1">
            <ElInput v-for="(id, idx) in smartMeterPassword" :key="'link-smartMeterPassword' + idx" class="smart-meter-id" type="text" :class="SmartMeterPasswordValid(idx)" v-model="smartMeterPassword[idx]" />
          </ElCol>
        </ElRow>
        <ElRow>
          <ElButton class="pull-right" type="primary" @click="SubmitSmartMeter">
            設定
          </ElButton>
        </ElRow>
      </div>
    </ElMain>
  </ElContainer>
</template>

<script>
  import QrcodeVue from 'qrcode.vue';
  import { Input, Progress, Select, Option } from 'element-ui';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/progress.css';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';

  export default {
    components: {
      QrcodeVue,
      ElInput: Input,
      ElProgress: Progress,
      ElSelect: Select,
      ElOption: Option,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        alias: {},
        hueBridges: [],
        hueProgress: {},
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
      };
    },
    mounted() {
      this.alias = Common.alias;
      this.hueProgressTimer = {};
      /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
      this.SetSystemConfig();
      Common.on('changeSystemConfig', () => {
        this.SetSystemConfig();
      });
      this.smartMeterConnect = Common.smartMeter;
      Common.on('changeSmartMeter', () => {
        this.smartMeterConnect = Common.smartMeter;
      });
      this.hueBridges = Common.hueBridges;
      Common.on('changeHueBridges', () => {
        this.hueBridges = Common.hueBridges;
        for(const bridge of this.hueBridges) {
          if(this.hueProgress[bridge.id] &&
             this.hueProgressTimer[bridge.id] &&
             bridge.message === '') {
            this.$set(this.hueProgress, bridge.id, 100);
          }
        }
      });
      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
      });
    },
    methods: {
      SetSystemConfig() {
        if(!Common.systemConfig) return;
        this.hap = Common.systemConfig.hap;
        this.hapPin = Common.systemConfig.bridge.pin;
        this.hapSetupURI = Common.systemConfig.bridge.setupURI;
        this.hapDeviceId = Common.systemConfig.bridge.username;
        this.smartMeterEnable = Common.systemConfig.smartMeter;
        this.smartMeterAdapter = Common.systemConfig.smartMeterAdapter;
        if(!this.smartMeterAdapter) this.smartMeterAdapter = this.smartMeterAdapters[0].id;
        const id = Common.systemConfig.smartMeterID;
        for(let i = 0; i < 8; i++) {
          if(id && (id.length === 4 * 8)) {
            this.smartMeterID[i] = id.substr(4 * i, 4);
          } else {
            this.smartMeterID[i] = '';
          }
        }
        const pw = Common.systemConfig.smartMeterPassword;
        for(let i = 0; i < 3; i++) {
          if(pw && (pw.length === 4 * 3)) {
            this.smartMeterPassword[i] = pw.substr(4 * i, 4);
          } else {
            this.smartMeterPassword[i] = '';
          }
        }
      },
      LightFlash(id, light) {
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id + '_' + light, command: 'flash' });
      },
      DeleteLight(id, light) {
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id + '_' + light, command: 'delete' });
        this.$delete(this.alias, 'Hue_' + id + '_' + light);
        Common.emit('changeAlias', this);
      },
      HuePairing(id) {
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'pairing' });
      },
      HueSearch(id) {
        this.HueProgressStart(id, 80);
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'search' });
      },
      HueTouchLink(id) {
        this.HueProgressStart(id, 80);
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'touchlink' });
      },
      HueProgressStart(id, time) {
        if(this.hueProgressTimer[id]) return;
        this.$set(this.hueProgress, id, 1);
        this.hueProgressTimer[id] = setInterval(() => {
          this.$set(this.hueProgress, id, this.hueProgress[id] + 1);
          if(this.hueProgress[id] > 100) {
            this.$set(this.hueProgress, id, 0);
            clearInterval(this.hueProgressTimer[id]);
            this.hueProgressTimer[id] = null;
          }
        }, time * 1000 / 100);
      },
      HueProgressing(id) {
        return (this.hueProgress[id] > 0) && (this.hueProgress[id] < 100);
      },
      SmartMeterIDValid(idx) {
        if(this.smartMeterID[idx].length !== 4) return { error: true };
        if(('0000' + parseInt(this.smartMeterID[idx], 16).toString(16).toUpperCase()).slice(-4) !== this.smartMeterID[idx]) return { error: true };
        return {};
      },
      SmartMeterPasswordValid(idx) {
        if(this.smartMeterPassword[idx].length !== 4) return { error: true };
        if(this.smartMeterPassword[idx].toUpperCase() !== this.smartMeterPassword[idx]) return { error: true };
        return {};
      },
      SubmitHue() {
        for(const bridge of this.hueBridges) {
          for(const l in bridge.lights) {
            this.$set(this.alias, 'Hue_' + bridge.id + '_' + l, {
              name: bridge.lights[l].name,
              type: 'hue',
              switch: {
                name: '',
                valueLabel: { '0': 'off', '1': 'on', '2': 'toggle' },
              },
            });
            Socket.emit('command',
              { type: 'command', device: 'Hue_' + bridge.id + '_' + l, command: 'name ' + bridge.lights[l].name });
          }
        }
        Common.emit('changeAlias', this);
      },
      SubmitHAP() {
        Common.systemConfig.bridge.username = this.hapDeviceId;
        Socket.emit('systemConfig', Common.systemConfig);
      },
      SubmitSmartMeter() {
        Common.systemConfig.smartMeterAdapter = this.smartMeterAdapter;
        let id = '';
        for(let i = 0; i < 8; i++) {
          if(this.smartMeterID[i].length === 4) {
            id += this.smartMeterID[i];
          } else {
            id = '';
            break;
          }
        }
        Common.systemConfig.smartMeterID = id;
        let pw = '';
        for(let i = 0; i < 3; i++) {
          if(this.smartMeterID[i].length === 4) {
            pw += this.smartMeterPassword[i];
          } else {
            pw = '';
            break;
          }
        }
        Common.systemConfig.smartMeterPassword = pw;
        Socket.emit('systemConfig', Common.systemConfig);
      },
    },
  };
</script>

<style scoped>
  .smart-meter-id {
    width: 12.5%;
  }

  .hap-qr {
    display: inline-block;
    vertical-align: middle;
  }

  .well-homekit {
    padding: 4px;
    font-size: 18px;
    font-family: Courier, 'NotoSansMonoCJKjp', monospace;
    text-align: center;
    border-radius: 0px;
    border-color: black;
    border-width: 2px;
    display:inline-block;
    padding: 4px;
    margin: 15px;
  }

  .label {
    margin: 15px 7px;
    display: inline-block;
  }
</style>


