<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3 scrollable">
      <p class="vertical-space1"/>
      <div class="well">
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
        <br>

        <div class="row">
          <h5>
            電源
          </h5>
        </div>
        <button type="button" :disabled="!shutdownEnable" @click="shutdownModal=true" class="btn btn-xs btn-primary system-config-btn">シャットダウン</button>
        <modal v-model="shutdownModal">
          <div slot="modal-header" class="modal-header">
            電源 シャットダウン
          </div>
          <div slot="modal-body" class="modal-body">
            シャットダウン処理を行います。<br>
            LEDの点滅が止まり、赤色のLEDの点灯のみになれば電源を抜いて大丈夫です。<br>
            再起動は電源を一度抜いてから、再度つないでください。
          </div>
          <div slot="modal-footer" class="modal-footer">
            <button type="button" class="btn btn-default" :disabled="!shutdownModalButton" @click="shutdownModal = false">中止</button>
            <button type="button" class="btn btn-primary" :disabled="!shutdownModalButton" @click="Shutdown" >実行</button>
          </div>
        </modal>
        <br>
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
        <div class="col-md-6">
          <el-tooltip placement="top" content="モバイル端末で受け取れるメールアドレス" effect="light" open-delay="500">
            <input type="text" name="account" :class="accountOK" v-model="account">
          </el-tooltip>
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <H5>パスワード</h5>
        </div>
        <div class="col-md-6">
          <el-tooltip placement="top" content="英数記号８文字以上" effect="light" open-delay="500">
            <input type="password" name="password1" :class="password1OK" v-model="password1">
          </el-tooltip>
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <H5>パスワード（確認）</h5>
        </div>
        <div class="col-md-6">
          <el-tooltip placement="top" content="英数記号８文字以上" effect="light" open-delay="500">
            <input type="password" name="password2" :class="password2OK" v-model="password2">
          </el-tooltip>
        </div>
      </div>
      <br>

      <div class="row">
        <div class="col-md-4">
          <h5>リモートアクセス</h5>
        </div>
        <div class="col-md-8">
          <el-tooltip placement="right" content="モバイル端末からのアクセスを許可します" effect="light" open-delay="500">
            <slide-switch v-model="remote" :buttons="[{label:'on', val:'on'}, {label:'off', val:'off'}]"/>
          </el-tooltip>
        </div>
        <br>
      </div>

      <div class="row">
        <div class="col-md-4">
          <h5>自動update</h5>
        </div>
        <div class="col-md-8">
          <el-tooltip placement="right" content="夜間にupdateを実行します" effect="light" open-delay="500">
            <slide-switch v-model="autoUpdate" :buttons="[{label:'on', val:'on'}, {label:'off', val:'off'}]"/>
          </el-tooltip>
        </div>
        <br>
      </div>

      <div class="row">
        <div class="col-md-4">
          <h5>Power LED</h5>
        </div>
        <div class="col-md-8">
          <el-tooltip placement="right" content="フロントパネルの電源LEDを設定します" effect="light" open-delay="500">
            <slide-switch v-model="powerLED" :buttons="[{label:'on', val:'on'}, {label:'off', val:'off'}]"/>
          </el-tooltip>
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <H5>通知用メールアドレス</h5>
        </div>
        <div class="col-md-6">
          <el-tooltip placement="top" content="プログラム等でのイベント通知のメールアドレス" effect="light" open-delay="500">
            <input type="email" :class="mailOK" v-model="mailto">
          </el-tooltip>
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <h5>リモートサーバー認証</h5>
        </div>
        <div class="col-md-6">
          <input @change="UploadRemoteKeyFile" id="remote-keyfile" type="file" accept="text/json" style="display:none">
          <el-tooltip placement="right" content="プレミアムアカウント用" effect="light" open-delay="500">
            <button type="button" class="btn btn-xs btn-primary" @click="RemoteKeyFile">認証鍵ファイルを設定</button>
          </el-tooltip>
        </div>
      </div>

      <div class="row">
        <div class="col-md-4">
          <h5>SSH</h5>
        </div>
        <div class="col-md-8">
          <input @change="UploadSSHKeyFile" id="ssh-keyfile" type="file" accept="text/json" style="display:none">
          <el-tooltip placement="right" content="ssh gecko@geckolink.localでloginできます" effect="light" open-delay="500">
            <button type="button" class="btn btn-xs btn-primary" @click="SSHKeyFile">公開鍵ファイルを設定</button>
          </el-tooltip>
        </div>
      </div>

      <br>

      <div class="row">
        <div class="col-md-9">
          <div class="pull-right">
            <button class="btn btn-sm btn-primary" type="button" @click="Submit">設定</button>
          </div>
          <modal v-model="accountMailMessage">
            <div slot="modal-header" class="modal-header">
              アカウント設定
            </div>
            <div slot="modal-body" class="modal-body">
              アカウントの確認のため、メールを送信しました。<br>
              3分以内にメールのリンクにアクセスしてください。<br>
              メールが届かない場合はアカウントの設定を再度確認してください。
            </div>
            <div slot="modal-footer" class="modal-footer">
              <button type="button" class="btn btn-default" @click="accountMailMessage = false">中止</button>
            </div>
          </modal>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { modal } from 'vue-strap';
  import { Tooltip } from 'element-ui';
  import 'element-ui/lib/theme-chalk/base.css';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import slideSwitch from './SlideSwitch.vue';
  import JsSHA from 'jssha';

  export default {
    components: {
      slideSwitch,
      modal,
      ElTooltip: Tooltip,
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
        password1: '',
        password2: '',
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
        shutdownModal: false,
        shutdownModalButton: true,
        powerLED: 'off',
        shutdownEnable: false,
        accountMailMessage: false,
      };
    },
    computed: {
      accountOK() {
        if(this.serverKeys && this.account === 'admin') {
          return {
            success: false,
            error: false,
          };
        }
        if(this.account.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          return {
            success: true,
            error: false,
          };
        }
        return {
          success: false,
          error: true,
          message: '有効なメールアドレスを設定してください。',
        };
      },
      password1OK() {
        return this.PasswordCheck(this.password1);
      },
      password2OK() {
        if(this.password1 !== this.password2) {
          return {
            success: false,
            error: true,
            message: '確認パスワードが合っていません。',
          };
        }
        return this.PasswordCheck(this.password2);
      },
      mailOK() {
        if(this.mailto === '') {
          return {
            success: false,
            error: false,
          };
        }
        if(this.mailto.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          return {
            success: true,
            error: false,
          };
        }
        return {
          success: false,
          error: true,
          message: '有効なメールアドレスを設定してください。',
        };
      },
    },
    mounted() {
      this.reader = new FileReader();

      Common.on('changeSystemConfig', () => {
        if(!Common.systemConfig || !Common.systemConfig.password) return;
        this.serverKeys = Common.systemConfig.serverKeys;
        this.sshKeys = Common.systemConfig.sshKeys;
        this.passwordValid = Common.systemConfig.password && Common.systemConfig.defaultPassword && (Common.systemConfig.password !== Common.systemConfig.defaultPassword);
        if(!this.passwordValid) Common.emit('toastr_error', this, '最初にアカウントとパスワードを設定してください。', 0);
        this.smartMeter = Common.systemConfig.smartMeter;
        if(this.accountMailMessage && (Common.systemConfig.remote === 'on')) this.accountMailMessage = false;
        this.SetSystemConfig();
      });
      Common.on('shutdownEnable', () => {
        this.shutdownEnable = Common.shutdownEnable;
      });

      this.authLoad = document.getElementById('auth-load');
      this.authSave = document.getElementById('auth-save');
      this.configLoad = document.getElementById('config-load');
      this.configSave = document.getElementById('config-save');
      this.remoteKeyFile = document.getElementById('remote-keyfile');
      this.sshKeyFile = document.getElementById('ssh-keyfile');
      this.SetSystemConfig();
    },
    methods: {
      PasswordCheck(password) {
        if(password === '') {
          if(!this.passwordValid && (this.account === 'admin')) {
            return {
              success: false,
              error: true,
              message: 'パスワードを設定してください。',
            };
          }
          if(!Common.systemConfig || (this.account !== Common.systemConfig.account)) {
            return {
              success: false,
              error: true,
              message: 'アカウント変更時はパスワードも再設定してください。',
            };
          }
          return {
            success: false,
            error: false,
          };
        }
        if(password.length < 8) {
          return {
            success: false,
            error: true,
            message: 'パスワードが短すぎます。',
          };
        }
        return {
          success: true,
          error: false,
        };
      },
      AuthSave() {
        const dt = new Date();
        this.authSave.href = this.authSave.origin +
          '/auth/gecko_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.sconf';
        this.authSave.click();
      },
      AuthLoad() {
        this.authLoadModal = false;
        this.authLoad.click();
      },
      AuthLoadFile() {
        this.reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('setAuth', this.reader.result);
            this.Reload();
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this.reader.readAsArrayBuffer(this.authLoad.files[0]);
      },
      ConfigSave() {
        const dt = new Date();
        this.configSave.href = this.configSave.origin +
          '/config/gecko_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.gconf';
        this.configSave.click();
      },
      ConfigLoad() {
        this.configLoadModal = false;
        this.configLoad.click();
      },
      ConfigLoadFile() {
        this.reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('setConfig', this.reader.result);
            this.Reload();
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this.reader.readAsArrayBuffer(this.configLoad.files[0]);
      },
      ConfigInit() {
        this.configInitModal = false;
        Socket.emit('initConfig');
        this.Reload();
      },
      Shutdown() {
        Socket.emit('shutdown');
        this.shutdownModalButton = false;
      },
      RemoteKeyFile() {
        this.remoteKeyFile.click();
      },
      UploadRemoteKeyFile() {
        this.reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            this.serverKeys = this.reader.result;
            Common.systemConfig.changeAuthKey = true;
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this.reader.readAsArrayBuffer(this.remoteKeyFile.files[0]);
      },
      SSHKeyFile() {
        this.sshKeyFile.click();
      },
      UploadSSHKeyFile() {
        this.reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            this.sshKeys = this.reader.result;
            Common.systemConfig.changeAuthKey = true;
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this.reader.readAsText(this.sshKeyFile.files[0]);
      },
      SetSystemConfig() {
        if(!Common.systemConfig) return;
        this.version = Common.systemConfig.version;
        this.account = Common.systemConfig.account;
        this.proxy = Common.systemConfig.proxy;
        this.remote = Common.systemConfig.remote;
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
        const accountCheck = this.accountOK;
        if(accountCheck.error) {
          Common.emit('toastr_error', this, accountCheck.message);
          return;
        }

        const passwordCheck = this.PasswordCheck(this.password1);
        if(passwordCheck.error) {
          Common.emit('toastr_error', this, passwordCheck.message);
          return;
        }
        Common.emit('toastr_clear', this);

        const mailCheck = this.mailOK;
        if(mailCheck.error) {
          Common.emit('toastr_error', this, mailCheck.message);
          return;
        }
        Common.emit('toastr_clear', this);

        const changeAccount = (this.password1 !== '') ||
                              (this.account !== Common.systemConfig.account);
        Common.systemConfig.account = this.account;
        if(this.password1 !== '') {
          const sha256 = new JsSHA('SHA-256', 'TEXT');
          sha256.update(this.account + this.password1);
          const digest = sha256.getHash('HEX');
          Common.systemConfig.password = digest;
        }
        Common.systemConfig.proxy = this.proxy;
        Common.systemConfig.mailto = this.mailto;
        Common.systemConfig.latitude = this.latitude;
        Common.systemConfig.longitude = this.longitude;
        Common.systemConfig.autoUpdate = this.autoUpdate;
        Common.systemConfig.serverKeys = this.serverKeys;
        Common.systemConfig.sshKeys = this.sshKeys;
        Common.systemConfig.powerLED = this.powerLED;
        if((this.remote !== 'on') || (Common.systemConfig.serverKeys != null)) {
          Common.systemConfig.remote = this.remote;
        }
        this.accountMailMessage = Common.systemConfig.remote !== this.remote;
        if(this.accountMailMessage) Common.systemConfig.requestRemoteAccessState = 1;
        Socket.emit('systemConfig', Common.systemConfig);
        Common.emit('toastr_success', this, '設定しました。');

        if(changeAccount && !this.accountMailMessage) {
          setTimeout(window.location.reload.bind(window.location), 600);
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

  input {
    width: 80%;
  }
</style>


