<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3 scrollable">
      <p class="vertical-space1"/><div class="well">
        <div class="row">
          <h5>
            システム設定 [ *.sconf ]
          </h5>
        </div>
        <a id="auth-save" style="display:none" href="/config/gecko_system_auth.bin"/>
        <button @click="AuthSave" class="btn btn-xs btn-primary system-config-btn">ファイルに保存</button>
        <input @change="AuthLoadFile" id="auth-load" type="file" accept=".sconf" style="display:none" >
        <button type="button" @click="authLoadModal=true" class="btn btn-xs btn-primary system-config-btn">ファイルから復元</button>
        <modal v-model="authLoadModal">
          <div slot="modal-header" class="modal-header">
            システム設定 [*.sconf]
          </div>
          <div slot="modal-body" class="modal-body">
            現在の各種設定値を上書きしますがよろしいですか？
          </div>
          <div slot="modal-footer" class="modal-footer">
            <button type="button" class="btn btn-default" @click="authLoadModal = false">中止</button>
            <button type="button" class="btn btn-primary" @click="AuthLoad" >実行</button>
          </div>
        </modal>

        <h6 class="system-config-btn">
          暗号鍵が含まれます。<br>
          取扱には注意して下さい。
          <br>
        </h6>

        <div class="row">
          <h5>
            それ以外の設定 [ *.gconf ]
          </h5>
        </div>
        <a id="config-save" style="display:none" href="/config/gecko_system_config.bin"/>
        <button @click="ConfigSave" class="btn btn-xs btn-primary system-config-btn">ファイルに保存</button>
        <input @change="ConfigLoadFile" id="config-load" type="file" accept=".gconf" style="display:none" >
        <button type="button" @click="configLoadModal=true" class="btn btn-xs btn-primary system-config-btn">ファイルから復元</button>
        <modal v-model="configLoadModal">
          <div slot="modal-header" class="modal-header">
            システム以外の設定[*.gconf]
          </div>
          <div slot="modal-body" class="modal-body">
            現在の各種設定値を上書きしますがよろしいですか？
          </div>
          <div slot="modal-footer" class="modal-footer">
            <button type="button" class="btn btn-default" @click="configLoadModal = false">中止</button>
            <button type="button" class="btn btn-primary" @click="ConfigLoad" >実行</button>
          </div>
        </modal>
        <br>

        <div class="row">
          <h5>
            初期化
          </h5>
        </div>
        <button type="button" @click="configInitModal=true" class="btn btn-xs btn-primary system-config-btn">工場出荷状態に戻す</button>
        <modal v-model="configInitModal">
          <div slot="modal-header" class="modal-header">
            初期化 工場出荷状態に戻す
          </div>
          <div slot="modal-body" class="modal-body">
            現在の設定値が全て消去されますがよろしいですか？
          </div>
          <div slot="modal-footer" class="modal-footer">
            <button type="button" class="btn btn-default" @click="configInitModal = false">中止</button>
            <button type="button" class="btn btn-primary" @click="ConfigInit" >実行</button>
          </div>
        </modal>
      </div>
    </div>
    <div class="col-sm-9 col-md-9 scrollable">
      <br>
      <div class="row">
        <div class="col-md-4">
          <H5>システムバージョン</h5>
        </div>
        <div class="col-md-8">
          <H5>{{ version }}</h5>
        </div>
      </div>
      <br>

      <div class="row">
        <div class="col-md-4">
          <H5>アカウント</h5>
        </div>
        <div class="col-md-8">
          <input type="text" :class="accountOK" v-model="account">
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <H5>パスワード</h5>
        </div>
        <div class="col-md-8">
          <input type="password" :class="passwordOK" v-model="password1">
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <H5>パスワード（確認）</h5>
        </div>
        <div class="col-md-8">
          <input type="password" :class="passwordOK" v-model="password2">
          <h6>このページへのlogin用。英数記号８文字以上</h6>
        </div>
      </div>
      <br>

      <div class="row">
        <div class="col-md-4">
          <h5>リモートサーバー利用</h5>
        </div>
        <div class="col-md-8">
          <slide-switch v-model="remote" :buttons="[{label:'on', val:'on'}, {label:'off', val:'off'}]"/>
        </div>
      </div>
      <fieldset :disabled="remote=='off'">
        <div class="row">
          <div class="col-md-4 col-md-offset-1">
            <H5>Proxy</h5>
          </div>
          <div class="col-md-6">
            <input type="text" v-model="proxy">
          </div>
        </div>

        <div class="row">
          <div class="col-md-4 col-md-offset-1">
            <h5>接続認証</h5>
          </div>
          <div class="col-md-6">
            <input @change="UploadRemoteKeyFile" id="remote-keyfile" type="file" accept="text/json" style="display:none">
            <button type="button" class="btn btn-xs btn-primary" @click="RemoteKeyFile">認証鍵ファイルを設定</button>
          </div>
        </div>

        <div class="row">
          <div class="col-md-4 col-md-offset-1">
            <H5>メールアドレス</h5>
          </div>
          <div class="col-md-6">
            <input type="mail" v-model="mailto">
          </div>
        </div>

        <div class="row" v-if="amesh">
          <div class="col-md-4 col-md-offset-1">
            <H5>緯度(xx.xxxxx)</h5>
          </div>
          <div class="col-md-6">
            N
            <input type="text" v-model="latitude">
          </div>
        </div>

        <div class="row" v-if="amesh">
          <div class="col-md-4 col-md-offset-1">
            <H5>経度(xxx.xxxxxx)</h5>
          </div>
          <div class="col-md-6">
            E
            <input type="text" v-model="longitude">
          </div>
        </div>
        <br>
      </fieldset>

      <div class="row">
        <div class="col-md-4">
          <h5>自動update</h5>
        </div>
        <div class="col-md-8">
          <slide-switch v-model="autoUpdate" :buttons="[{label:'on', val:'on'}, {label:'off', val:'off'}]"/>
        </div>
        <br>
      </div>

      <div class="row">
        <div class="col-md-4">
          <h5>SSH</h5>
        </div>
        <div class="col-md-8">
          <input @change="UploadSSHKeyFile" id="ssh-keyfile" type="file" accept="text/json" style="display:none">
          <button type="button" class="btn btn-xs btn-primary" @click="SSHKeyFile">公開鍵ファイルを設定</button>
          <div class="item-label">
            gecko@geckolink.local
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-9">
          <div class="pull-right">
            <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { modal } from 'vue-strap';
  import slideSwitch from './SlideSwitch.vue';
  import JsSHA from 'jssha';

  export default {
    components: {
      slideSwitch,
      modal,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        version: '',
        account: '',
        password1: 'dummypasswd',
        password2: 'dummypasswd',
        passwordValid: false,
        remote: 'off',
        proxy: '',
        mailto: '',
        autoUpdate: 'off',
        amesh: false,
        latitude: '',
        longitude: '',
        authLoadModal: false,
        configLoadModal: false,
        configInitModal: false,
      };
    },
    computed: {
      accountOK() {
        if(this.account.length >= 4) {
          if(this.account === 'admin') {
            if(!this.passwordValid &&
              (this.password1 === 'dummypasswd') &&
              (this.password2 === 'dummypasswd')) {
              return {
                success: false,
                error: true,
              };
            }
            return {
              success: false,
              error: false,
            };
          }
          return {
            success: true,
            error: false,
          };
        }
        return {
          success: false,
          error: true,
        };
      },
      passwordOK() {
        if((this.password1 === this.password2) && (this.password1.length >= 8)) {
          if(this.password1 === 'dummypasswd') {
            if(!this.passwordValid &&
              (this.account === 'admin')) {
              return {
                success: false,
                error: true,
              };
            }
            return {
              success: false,
              error: false,
            };
          }
          return {
            success: true,
            error: false,
          };
        }
        return {
          success: false,
          error: true,
        };
      },
    },
    mounted() {
      this._reader = new FileReader();

      Common.on('changeSystemConfig', () => {
        if(!Common.systemConfig || !Common.systemConfig.password) return;
        this._serverKeys = Common.systemConfig.serverKeys;
        this._sshKeys = Common.systemConfig.sshKeys;
        this.passwordValid = Common.systemConfig.password && Common.systemConfig.defaultPassword && (Common.systemConfig.password !== Common.systemConfig.defaultPassword);
        if(!this.passwordValid) Common.emit('toastr_error', this, '最初にアカウントとパスワードを設定してください。', 0);
        this.smartMeter = Common.systemConfig.smartMeter;
        this.SetSystemConfig();
      });

      this._authLoad = document.getElementById('auth-load');
      this._authSave = document.getElementById('auth-save');
      this._configLoad = document.getElementById('config-load');
      this._configSave = document.getElementById('config-save');
      this._remoteKeyFile = document.getElementById('remote-keyfile');
      this._sshKeyFile = document.getElementById('ssh-keyfile');
      this.SetSystemConfig();
    },
    methods: {
      AuthSave() {
        const dt = new Date();
        this._authSave.href = this._authSave.origin +
          '/auth/gecko_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.sconf';
        this._authSave.click();
      },
      AuthLoad() {
        this.authLoadModal = false;
        this._authLoad.click();
      },
      AuthLoadFile() {
        this._reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('setAuth', this._reader.result);
            this.Reload();
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this._reader.readAsArrayBuffer(this._authLoad.files[0]);
      },
      ConfigSave() {
        const dt = new Date();
        this._configSave.href = this._configSave.origin +
          '/config/gecko_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.gconf';
        this._configSave.click();
      },
      ConfigLoad() {
        this.configLoadModal = false;
        this._configLoad.click();
      },
      ConfigLoadFile() {
        this._reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('setConfig', this._reader.result);
            this.Reload();
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this._reader.readAsArrayBuffer(this._configLoad.files[0]);
      },
      ConfigInit() {
        this.configInitModal = false;
        Socket.emit('initConfig');
        this.Reload();
      },
      RemoteKeyFile() {
        this._remoteKeyFile.click();
      },
      UploadRemoteKeyFile() {
        this._reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            this._serverKeys = this._reader.result;
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this._reader.readAsArrayBuffer(this._remoteKeyFile.files[0]);
      },
      SSHKeyFile() {
        this._sshKeyFile.click();
      },
      UploadSSHKeyFile() {
        this._reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            this._sshKeys = this._reader.result;
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this._reader.readAsText(this._sshKeyFile.files[0]);
      },
      SetSystemConfig() {
        if(!Common.systemConfig) return;
        this.version = Common.systemConfig.version;
        this.account = Common.systemConfig.account;
        this.remote = Common.systemConfig.remote;
        this.proxy = Common.systemConfig.proxy;
        this.mailto = Common.systemConfig.mailto;
        this.amesh = Common.systemConfig.amesh;
        this.latitude = Common.systemConfig.latitude;
        this.longitude = Common.systemConfig.longitude;
        this.autoUpdate = Common.systemConfig.autoUpdate;
      },
      Reload() {
        setTimeout(() => { location.reload(); }, 3000);
      },
      Submit() {
        if(this.account.length < 4) {
          Common.emit('toastr_error', this, 'アカウント名が短すぎます。');
          return;
        }
        if(this.password1 !== this.password2) {
          Common.emit('toastr_error', this, 'パスワードが合っていません。');
          return;
        }
        if(this.password1.length < 8) {
          Common.emit('toastr_error', this, 'パスワードが短すぎます。');
          return;
        }

        Common.emit('toastr_clear', this);
        Common.systemConfig.account = this.account;
        if(this.password1 !== 'dummypasswd') {
          const sha256 = new JsSHA('SHA-256', 'TEXT');
          sha256.update(this.account + this.password1);
          const digest = sha256.getHash('HEX');
          Common.systemConfig.password = digest;
        }
        Common.systemConfig.remote = this.remote;
        Common.systemConfig.proxy = this.proxy;
        Common.systemConfig.mailto = this.mailto;
        Common.systemConfig.latitude = this.latitude;
        Common.systemConfig.longitude = this.longitude;
        Common.systemConfig.autoUpdate = this.autoUpdate;
        Common.systemConfig.serverKeys = this._serverKeys;
        Common.systemConfig.sshKeys = this._sshKeys;
        Socket.emit('systemConfig', Common.systemConfig);
        Common.emit('toastr_success', this, '設定しました。');
        if(this.password1 !== 'dummypasswd') {
          setTimeout(window.location.reload.bind(window.location), 1000);
        }
      },
    },
  };
</script>

<style scoped>
  .item-label {
    display:inline;
    margin: 0vh 0.2vw 0vh 0.5vw;
  }

  .system-config-btn {
    width: 70%;
    margin: 1vh;
  }

  .vertical-space1 {
    margin-top: 5vh;
  }

  fieldset:disabled  {
    color: #aaa;
  }
</style>


