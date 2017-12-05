<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div v-if="hueBridges && (hueBridges.length > 0)" class="row">
      <div class="col-sm-3 col-md-3">
        <br>
        <h4>Hue</h4>
      </div>
      <div class="col-sm-7 col-md-7 scrollable">
        <br>
        <div v-for="bridge of hueBridges">
          <div class="row">
            <div class="col-md-4">
              Bridge {{bridge.id}}
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
          </div>
          <h6>
            {{bridge.message}}
          </h6>
          <br>
          <div v-for="(light,idx) of bridge.lights" class="row">
            <div class="col-md-3 col-md-offset-1">
              <input class="func-name" type="text" v-model="light.name"/>
            </div>
            <div class="col-md-4">
              <button @click="LightFlash" type="button" class="btn btn-primary btn-xs btn-margin" :data-id="bridge.id" :data-light="idx">
                フラッシュ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <hr class="separation">
    <div v-if="hap" class="row">
      <div class="col-md-3">
        <br>
        <h4>HAP Device</h4>
      </div>
      <div class="col-md-7 scrollable">
        <br>
        <div class="row">
          <div class="col-md-4">
            <img src="../images/home.png" width="40px"/>
          </div>
          <div class="col-md-8">
            <qrcode class="hap-qr" :value="hapSetupURI"></qrcode>
            <div class="well well-homekit">
              {{hapPin}}
            </div>
          </div>
        </div>
        <br>
        <div class="row">
          <div class="col-md-4">
            <H5>HAPデバイスID</h5>
          </div>
          <div class="col-md-8">
            <input type="text" v-model="hapDeviceId"/>
          </div>
          <br>
        </div>
      </div>
    </div>
    <hr v-if="hap" class="separation">
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
              <option v-for="item of smartMeterAdapters" :value="item.id">{{item.name}}</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <H5>電力計ＩＤ</h5>
          </div>
          <div class="col-md-8">
            <input v-for="(id, idx) in smartMeterID" class="smart-meter-id" type="text" :class="SmartMeterIDValid(idx)" v-model="smartMeterID[idx]"/>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <H5>電力計パスワード</h5>
          </div>
          <div class="col-md-8">
            <input v-for="(id, idx) in smartMeterPassword" class="smart-meter-id" type="text" :class="SmartMeterPasswordValid(idx)" v-model="smartMeterPassword[idx]"/>
          </div>
        </div>
      </div>
    </div>
    <hr v-if="smartMeterEnable && smartMeterConnect" class="separation">
    <div class="row">
      <div class="col-md-10">
        <div class="pull-right">
          <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import VueQRcode from 'v-qrcode';

  export default {
    props: {
      display: false,
    },
    data() {
      return {
        alias: {},
        hueBridges: [],
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
      HuePairing(e) {
        const id = e.target.dataset.id;
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'pairing' });
      },
      HueSearch(e) {
        const id = e.target.dataset.id;
        Socket.emit('command',
          { type: 'command', device: 'Hue_' + id, command: 'search' });
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
    components: {
      qrcode: VueQRcode,
    },
  };
</script>

<style scoped>
  .smart-meter-id {
    width: 40px;
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
</style>


