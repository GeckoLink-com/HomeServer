<template>
  <el-container>
    <el-aside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>システム設定</h4>
      <div class="well">
        <div class="no-mobile">
          <el-row>
            <h5>アカウント設定 [ *.sconf ]</h5>
          </el-row>
          <a id="auth-save" style="display:none" href="/config/gecko_system_auth.bin"/>
          <el-tooltip placement="right" content="暗号鍵が含まれるので取扱注意！" effect="light" open-delay="500">
            <el-button @click="AuthSave" type="primary" class="system-config-btn">ファイルに保存</el-button>
          </el-tooltip>

          <input @change="AuthLoadFile" id="auth-load" type="file" accept=".sconf" style="display:none" >
          <el-button type="warning" @click="authLoadModal=true" class="system-config-btn" plain>ファイルから復元</el-button>
          <el-dialog title="アカウント設定 [*.sconf]" :visible.sync="authLoadModal" :show-close="false">
            現在の各種設定値を上書きしますがよろしいですか？
            <div slot="footer" class="dialog-footer">
              <el-button type="default" @click="authLoadModal = false">中止</el-button>
              <el-button type="danger" @click="AuthLoad" plain>実行</el-button>
            </div>
          </el-dialog>
          <el-row>
            <h5>それ以外の設定 [ *.gconf ]</h5>
          </el-row>
          <a id="config-save" style="display:none" href="/config/gecko_system_config.bin"/>
          <el-button @click="ConfigSave" type="primary" class="system-config-btn">ファイルに保存</el-button>

          <input @change="ConfigLoadFile" id="config-load" type="file" accept=".gconf" style="display:none" >
          <el-button type="warning" @click="configLoadModal=true" class="system-config-btn" plain>ファイルから復元</el-button>
          <el-dialog title="システム以外の設定[*.gconf]" :visible.sync="configLoadModal" :show-close="false">
            現在の各種設定値を上書きしますがよろしいですか？
            <div slot="footer" class="dialog-footer">
              <el-button type="default" @click="configLoadModal = false">中止</el-button>
              <el-button type="danger" @click="ConfigLoad" plain>実行</el-button>
            </div>
          </el-dialog>
          <br>

          <el-row>
            <h5>初期化</h5>
          </el-row>
          <el-button type="warning" @click="configInitModal=true" class="system-config-btn" plain>工場出荷状態に戻す</el-button>
          <el-dialog title="初期化" :visible.sync="configInitModal" :show-close="false">
            工場出荷状態に戻します。<br>
            現在の設定値が全て消去されますがよろしいですか？
            <div slot="footer" class="dialog-footer">
              <el-button type="default" @click="configInitModal = false">中止</el-button>
              <el-button type="danger" @click="ConfigInit" plain>実行</el-button>
            </div>
          </el-dialog>
          <br>
        </div>

        <el-row>
          <h5>電源</h5>
        </el-row>
        <el-button type="warning" :disabled="!shutdownEnable" @click="shutdownModal=true" class="system-config-btn" plain>シャットダウン</el-button>
        <el-dialog title="電源 シャットダウン" :modal="true" :visible.sync="shutdownModal" :show-close="false">
          シャットダウン処理を行います。<br>
          LEDの点滅が止まり、赤色のLEDの点灯のみになれば電源を抜いて大丈夫です。<br>
          再起動は電源を一度抜いてから、再度つないでください。
          <div slot="footer" class="dialog-footer">
            <el-button type="default" :disabled="!shutdownModalButton" @click="shutdownModal = false">中止</el-button>
            <el-button type="danger" :disabled="!shutdownModalButton" @click="Shutdown" plain>実行</el-button>
          </div>
        </el-dialog>
        <br>
      </div>
    </el-aside>

    <el-main>
      <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
        <el-form-item label="システムバージョン" prop="version">
          {{ version }}
        </el-form-item>

        <el-form-item label="アカウント" prop="account">
          <el-tooltip placement="top" content="モバイル端末で受け取れるメールアドレス" effect="light" open-delay="500">
            <el-input type="text" name="account" v-model="ruleForm.account" />
          </el-tooltip>
        </el-form-item>

        <el-form-item label="パスワード" prop="password1">
          <el-tooltip placement="top" content="英数記号８文字以上" effect="light" open-delay="500">
            <el-input type="password" name="password1" v-model="ruleForm.password1" />
          </el-tooltip>
        </el-form-item>

        <el-form-item label="パスワード（確認）" prop="password2">
          <el-tooltip placement="top" content="英数記号８文字以上" effect="light" open-delay="500">
            <el-input type="password" name="password2" v-model="ruleForm.password2" />
          </el-tooltip>
        </el-form-item>

        <el-form-item label="リモートアクセス" prop="remote">
          <el-tooltip placement="right" content="モバイル端末からのアクセスを許可します" effect="light" open-delay="500">
            <el-switch v-model="remote" />
          </el-tooltip>
        </el-form-item>

        <el-form-item label="自動update" prop="autoUpdate">
          <el-tooltip placement="right" content="夜間にupdateを実行します" effect="light" open-delay="500">
            <el-switch v-model="autoUpdate" />
          </el-tooltip>
        </el-form-item>

        <el-form-item label="Power LED" prop="powerLED">
          <el-tooltip placement="right" content="フロントパネルの電源LEDを設定します" effect="light" open-delay="500">
            <el-switch v-model="powerLED"/>
          </el-tooltip>
        </el-form-item>

        <el-form-item label="通知用メールアドレス" prop="mailto">
          <el-tooltip placement="top" content="プログラム等でのイベント通知のメールアドレス" effect="light" open-delay="500">
            <el-input type="email" v-model="ruleForm.mailto" />
          </el-tooltip>
        </el-form-item>

        <div class="no-mobile">
          <el-form-item label="リモートサーバー認証" prop="remoteKey">
            <el-tooltip placement="right" content="プレミアムアカウント用" effect="light" open-delay="500">
              <el-button type="primary" @click="RemoteKeyFile">認証鍵ファイルを設定</el-button>
            </el-tooltip>
          </el-form-item>
          <input @change="UploadRemoteKeyFile" id="remote-keyfile" type="file" accept="text/json" style="display:none">

          <el-form-item label="SSH" prop="sshKey">
            <el-tooltip placement="right" content="ssh gecko@geckolink.localでloginできます" effect="light" open-delay="500">
              <el-button type="primary" @click="SSHKeyFile">公開鍵ファイルを設定</el-button>
            </el-tooltip>
          </el-form-item>
          <input @change="UploadSSHKeyFile" id="ssh-keyfile" type="file" accept="text/json" style="display:none">
        </div>

        <el-form-item>
          <el-col offset="20">
            <el-button type="primary" :disabled="!rulesValid" @click="Submit">設定</el-button>
          </el-col>
        </el-form-item>
        <el-dialog title="アカウント設定" :visible.sync="accountMailMessage" :show-close="false">
          アカウントの確認のため、メールを送信しました。<br>
          3分以内にメールのリンクにアクセスしてください。<br>
          メールが届かない場合はアカウントの設定を再度確認してください。
          <div slot="footer" class="dialog-footer">
            <el-button type="default" @click="accountMailMessage = false">中止</el-button>
          </div>
        </el-dialog>

      </el-form>
    </el-main>
  </el-container>
</template>

<script>
  import { Tooltip, Form, FormItem, Switch, Dialog, Input } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/switch.css';
  import 'element-ui/lib/theme-chalk/dialog.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import JsSHA from 'jssha';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElForm: Form,
      ElFormItem: FormItem,
      ElSwitch: Switch,
      ElDialog: Dialog,
      ElInput: Input,
    },
    data() {
      return {
        version: '',
        passwordValid: false,
        remote: false,
        proxy: '',
        autoUpdate: true,
        amesh: false,
        latitude: '',
        longitude: '',
        authLoadModal: false,
        configLoadModal: false,
        configInitModal: false,
        shutdownModal: false,
        shutdownModalButton: true,
        powerLED: false,
        shutdownEnable: false,
        accountMailMessage: false,
        ruleForm: {
          account: '',
          password1: '',
          password2: '',
          mailto: '',
        },
        rules: {
          account: [
            { validator: this.ValidateAccount.bind(this), trigger: [ 'blur', 'change' ] },
          ],
          password1: [
            { validator: this.ValidatePassword1.bind(this), trigger: [ 'blur', 'change' ] },
          ],
          password2: [
            { validator: this.ValidatePassword2.bind(this), trigger: [ 'blur', 'change' ] },
          ],
          mailto: [
            { type: 'email', message: '有効なメールアドレスを設定してください。', trigger: [ 'blur', 'change' ] },
          ],
        },
        ruleValid: {
          account: true,
          password1: true,
          password2: true,
          mailto: true,
        },
      };
    },
    computed: {
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
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
        if(this.accountMailMessage && Common.systemConfig.remote) this.accountMailMessage = false;
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
      ValidateAccount(rule, value, callback) {
        this.$nextTick(() => {
          this.$refs.ruleForm.validateField('password1');
        });
        if(this.serverKeys && (value === 'admin')) return callback();
        if(value.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          return callback();
        }
        callback(new Error('有効なメールアドレスを設定してください。'));
      },
      ValidatePassword1(rule, value, callback) {
        this.$nextTick(() => {
          this.$refs.ruleForm.validateField('password2');
        });

        if(value === '') {
          if(!this.passwordValid && (this.ruleForm.account === 'admin')) {
            return callback(new Error('パスワードを設定してください。'));
          }
          if(!Common.systemConfig || (this.ruleForm.account !== Common.systemConfig.account)) {
            return callback(new Error('アカウント変更時はパスワードも再設定してください。'));
          }
          return callback();
        }
        if(value.length < 8) {
          return callback(new Error('パスワードが短すぎます。'));
        }
        callback();
      },
      ValidatePassword2(rule, value, callback) {
        if(value !== this.ruleForm.password1) {
          return callback(new Error('確認パスワードが合っていません。'));
        }
        callback();
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
        this.ruleForm.account = Common.systemConfig.account;
        this.proxy = Common.systemConfig.proxy;
        this.remote = Common.systemConfig.remote;
        this.ruleForm.mailto = Common.systemConfig.mailto;
        this.amesh = Common.systemConfig.amesh;
        this.latitude = Common.systemConfig.latitude;
        this.longitude = Common.systemConfig.longitude;
        this.autoUpdate = Common.systemConfig.autoUpdate;
      },
      Reload() {
        setTimeout(() => { location.reload(); }, 3000);
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      Submit() {
        this.$refs.ruleForm.validate((valid) => {
          if(!valid) return;

          const changeAccount = (this.ruleForm.password1 !== '') ||
                                (this.ruleForm.account !== Common.systemConfig.account);
          Common.systemConfig.account = this.ruleForm.account;
          if(this.ruleForm.password1 !== '') {
            const sha256 = new JsSHA('SHA-256', 'TEXT');
            sha256.update(this.ruleForm.account + this.ruleForm.password1);
            const digest = sha256.getHash('HEX');
            Common.systemConfig.password = digest;
          }
          Common.systemConfig.proxy = this.proxy;
          Common.systemConfig.mailto = this.ruleForm.mailto;
          Common.systemConfig.latitude = this.latitude;
          Common.systemConfig.longitude = this.longitude;
          Common.systemConfig.autoUpdate = this.autoUpdate;
          Common.systemConfig.serverKeys = this.serverKeys;
          Common.systemConfig.sshKeys = this.sshKeys;
          Common.systemConfig.powerLED = this.powerLED;
          if(!this.remote || (Common.systemConfig.serverKeys != null)) {
            Common.systemConfig.remote = this.remote;
          }
          this.accountMailMessage = Common.systemConfig.remote !== this.remote;
          if(this.accountMailMessage) Common.systemConfig.requestRemoteAccessState = 1;
          Socket.emit('systemConfig', Common.systemConfig);
          Common.emit('toastr_success', this, '設定しました。');

          if(changeAccount && !this.accountMailMessage) {
            setTimeout(window.location.reload.bind(window.location), 600);
          }
        });
      },
    },
  };
</script>

<style scoped>
  .system-config-btn {
    width: 80%;
    margin: 1vh;
  }
</style>


