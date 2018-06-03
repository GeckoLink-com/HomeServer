<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-12 col-md-12 scrollable">
      <div v-if="hueBridges && (hueBridges.length > 0)" class="row">
        <div class="col-sm-3 col-md-3">
          <br>
          <h4>Hue</h4>
        </div>
        <div class="col-sm-7 col-md-7 scrollable">
          <br>
          <div v-for="bridge of hueBridges" :key="'link-hueBridges' + bridge.id">
            <div class="row">
              <div class="col-md-4">
                Bridge {{ bridge.id }}
              </div>
              <div v-if="bridge.state==0" class="col-md-4">
                <button @click="HuePairing" type="button" class="btn btn-primary btn-xs btn-margin" :data-id="bridge.id">
                  ペアリング
                </button>
              </div>
              <div v-if="bridge.state>=1" class="col-md-4">
                <button :disabled="bridge.state==2" @click="HueSearch" type="button" class="btn btn-primary btn-xs btn-margin" :data-id="bridge.id">
                  新規ライトのサーチ
                </button>
              </div>
              <div v-if="bridge.state>=1" class="col-md-4">
                <button :disabled="bridge.state==2" @click="HueTouchLink" type="button" class="btn btn-primary btn-xs btn-margin" :data-id="bridge.id">
                  TouchLinkサーチ
                </button>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6 col-md-offset-1">
                <div class="progress" v-if="hueProgress[bridge.id] > 0">
                  <progressbar :now="hueProgress[bridge.id]" type="primary" :striped="HueProgressing(bridge.id)" :animated="HueProgressing(bridge.id)"/>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6 col-md-offset-1">
                <h6>
                  {{ bridge.message }}
                </h6>
              </div>
            </div>
            <br>
            <div v-for="(light,idx) of bridge.lights" :key="'link-lights' + idx" class="row">
              <div class="col-md-3 col-md-offset-1">
                <input class="func-name" type="text" v-model="light.name">
              </div>
              <div class="col-md-4">
                <button @click="LightFlash" type="button" class="btn btn-primary btn-xs btn-margin" :data-id="bridge.id" :data-light="idx">
                  フラッシュ
                </button>
              </div>
              <div class="col-md-4">
                <button @click="DeleteLight" type="button" class="btn btn-danger btn-xs btn-margin" :data-id="bridge.id" :data-light="idx">
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-10">
            <div class="pull-right">
              <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
            </div>
          </div>
        </div>
        <hr class="separation">

      </div>

      <div v-if="hap" class="row">
        <div class="col-md-3">
          <br>
          <h4>HAP Device</h4>
        </div>
        <div class="col-md-7 scrollable">
          <br>
          <div class="row">
            <div class="col-md-4">
              <img src="../images/home.png" alt="home" width="40px">
            </div>
            <div class="col-md-8">
              <qrcode class="hap-qr" :value="hapSetupURI"/>
              <div class="well well-homekit">
                {{ hapPin }}
              </div>
            </div>
          </div>
          <br>
          <div class="row">
            <div class="col-md-4">
              <H5>HAPデバイスID</h5>
            </div>
            <div class="col-md-8">
              <input type="text" v-model="hapDeviceId">
            </div>
            <br>
          </div>
        </div>

        <div class="row">
          <div class="col-md-10">
            <div class="pull-right">
              <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
            </div>
          </div>
        </div>
        <hr class="separation">

      </div>

      <div v-if="smartMeterEnable && smartMeterConnect" class="row">
        <div class="col-md-3">
          <br>
          <h4>SmartMeter</h4>
        </div>
        <div class="col-md-7 scrollable">
          <br>
          <div class="row">
            <div class="col-md-4">
              <H5>Wi-SUNドングル</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control wisun-select-menu btn-inline" v-model="smartMeterAdapter">
                <option v-for="item of smartMeterAdapters" :key="'link-smartMeterAdapters' + item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="col-md-4">
              <H5>電力計ＩＤ</h5>
            </div>
            <div class="col-md-8">
              <input v-for="(id, idx) in smartMeterID" :key="'link-smartMeterID' + idx" class="smart-meter-id" type="text" :class="SmartMeterIDValid(idx)" v-model="smartMeterID[idx]">
            </div>
          </div>
          <div class="row">
            <div class="col-md-4">
              <H5>電力計パスワード</h5>
            </div>
            <div class="col-md-8">
              <input v-for="(id, idx) in smartMeterPassword" :key="'link-smartMeterPassword' + id" class="smart-meter-id" type="text" :class="SmartMeterPasswordValid(idx)" v-model="smartMeterPassword[idx]">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-10">
            <div class="pull-right">
              <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
            </div>
          </div>
        </div>
        <hr class="separation">

      </div>
    </div>
  </div>
</template>

<script>
  import qrcode from 'v-qrcode';
  import { progressbar } from 'vue-strap';

  export default {
    components: {
      qrcode,
      progressbar,
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
      LightFlash(e) {
        const id = e.target.dataset.id;
        const light = e.target.dataset.light;
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id + '_' + light, command: 'flash' });
      },
      DeleteLight(e) {
        const id = e.target.dataset.id;
        const light = e.target.dataset.light;
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id + '_' + light, command: 'delete' });
      },
      HuePairing(e) {
        const id = e.target.dataset.id;
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'pairing' });
      },
      HueSearch(e) {
        const id = e.target.dataset.id;
        this.HueProgressStart(id, 80);
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'search' });
      },
      HueTouchLink(e) {
        const id = e.target.dataset.id;
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
      BTPairing(e) {
        console.log(e.target);
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
      Submit() {
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
        Common.systemConfig.bridge.username = this.hapDeviceId;
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
    width: 50px;
  }

  .wisun-select-menu {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:12px;
    margin: 0px;
    padding:0px;
    text-align: center;
    width: 300px;
    height:20px;
    line-height:20px
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

  .separation {
    width: 960px;
    margin: 5vh 0.5vw 1vh 0.5vw;
  }

  .func-name {
    width:12vw;
  }

  .btn-inline {
    display:inline-block;
    margin-left: 0.2vw;
  }

  .btn-margin {
    margin-right:0.2vw;
  }

  .progress {
    margin: 2%;
  }
</style>


