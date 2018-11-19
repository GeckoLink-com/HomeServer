<template>
  <div>
    <navbar placement="top" type="default" id="top-bar" @page="Click">
      <div slot="brand">
        <img src="../images/GeckoLogo.png" class="logo" alt="GeckoLink"
             @mousedown="TouchLogoStart"
             @touchstart="TouchLogoStart"
             @mouseup="TouchLogoEnd"
             @touchend="TouchLogoEnd">
      </div>
      <li data-to="/system_setup">システム設定</li>
      <dropdown text="子機設定" :disabled="!moduleMenu || !passwordValid" >
        <li data-to="/pairing" :disabled="!module">ペアリング</li>
        <li data-to="/basic_setup" >基本設定</li>
        <li data-to="/advanced_setup" class="no-mobile" >詳細設定</li>
        <li data-to="/module_list" >子機一覧</li>
      </dropdown>
      <li data-to="/link_devices" :disabled="!passwordValid" >リンク機器</li>
      <dropdown text="リモコン" :disabled="!passwordValid" >
        <li data-to="/remocon" >リモコン設定</li>
        <li data-to="/remocon_macro" >マクロ登録・編集</li>
        <li data-to="/remocon_aircon" class="no-mobile" >エアコン設定</li>
        <li data-to="/remocon_tv" class="no-mobile" >テレビ設定</li>
      </dropdown>
      <li data-to="/ui_setting" :disabled="!passwordValid" class="no-mobile" >UI設定</li>
      <li data-to="/node_red" :disabled="!passwordValid" class="no-mobile" >プログラム</li>
      <li data-to="/debug_panel" v-show="debug" :disabled="!passwordValid" >debug</li>
    </navbar>

    <div class="main-container">
      <system-setup v-show="selectedTab==='/system_setup'" />
      <pairing v-show="selectedTab==='/pairing'" />
      <basic-setup v-show="selectedTab==='/basic_setup'" />
      <advanced-setup v-show="selectedTab==='/advanced_setup'" />
      <module-list v-show="selectedTab=='/module_list'" />
      <link-devices v-show="selectedTab==='/link_devices'" />
      <remocon v-show="selectedTab==='/remocon'" />
      <remocon-macro v-show="selectedTab==='/remocon_macro'" />
      <remocon-aircon v-show="selectedTab==='/remocon_aircon'" />
      <remocon-tv v-show="selectedTab==='/remocon_tv'" />
      <ui-setting v-show="selectedTab==='/ui_setting'" />
      <node-red :display="selectedTab==='/node_red'" />
      <debug-panel v-show="selectedTab==='/debug_panel'" />
      <toastr />
    </div>

    <el-dialog title="モバイル端末接続確認" :visible.sync="requestAuth" :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false" >
      3分以内にモバイル端末に表示されている6桁のパスコードを入力してください。<br>
      もしモバイル端末の登録をしようとしていない場合は拒否を選択してください。<br>
      <el-row>
        <el-col v-for="i in 6" :key="'passcode' + i" offset="1" span="3">
          <el-input type="text" :ref="'passcode'+(i-1)" :autofocus="i == 1" v-model="passcode[i - 1]" maxlength="1" pattern="[0-9]" @input="Passcode(i)" />
        </el-col>
      </el-row>
      <div slot="footer" class="dialog-footer">
        <el-button type="danger" @click="RejectAuth">拒否</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
  import { Dialog, Input } from 'element-ui';
  import 'element-ui/lib/theme-chalk/dialog.css';
  import 'element-ui/lib/theme-chalk/input.css';

  import Navbar from './Navbar.vue';
  import Dropdown from './Dropdown.vue';
  import Toastr from './Toastr.vue';

  import SystemSetup from './SystemSetup.vue';
  import Pairing from './Pairing.vue';
  import BasicSetup from './BasicSetup.vue';
  import AdvancedSetup from './AdvancedSetup.vue';
  import ModuleList from './ModuleList.vue';
  import LinkDevices from './LinkDevices.vue';
  import Remocon from './Remocon.vue';
  import RemoconMacro from './RemoconMacro.vue';
  import RemoconAircon from './RemoconAircon.vue';
  import RemoconTv from './RemoconTV.vue';
  import UiSetting from './UISetting.vue';
  import NodeRed from './NodeRED.vue';
  import DebugPanel from './DebugPanel.vue';

  export default {
    components: {
      ElDialog: Dialog,
      ElInput: Input,
      Navbar,
      Dropdown,
      Toastr,
      SystemSetup,
      Pairing,
      BasicSetup,
      AdvancedSetup,
      ModuleList,
      LinkDevices,
      Remocon,
      RemoconMacro,
      RemoconAircon,
      RemoconTv,
      UiSetting,
      NodeRed,
      DebugPanel,
    },
    data() {
      return {
        module: false,
        moduleMenu: false,
        debug: false,
        passwordValid: false,
        selectedTab: '/system_setup',
        requestAuth: false,
        passcode: [],
        passcodeFocus: 0,
      };
    },
    mounted() {
      Common.on('changeDevices', () => {
        let f = false;
        for(const dev of Common.devices) {
          if(dev.device === 'pairing') {
            if(dev.state === 'connect') {
              this.module = true;
              f = true;
            } else {
              this.module = false;
            }
          } else {
            f = true;
          }
        }
        this.moduleMenu = f;
      });
      Common.on('changeSystemConfig', () => {
        this.passwordValid = Common.systemConfig.password && Common.systemConfig.defaultPassword && (Common.systemConfig.password !== Common.systemConfig.defaultPassword);
      });
      Common.on('requestAuth', (_caller, flag) => {
        this.requestAuth = flag;
        this.passcodeFocus = 0;
        this.passcode = [];
        if(this.requestAuth) {
          this.$nextTick(() => {
            this.$refs['passcode' + this.passcodeFocus][0].focus();
            this.$refs['passcode' + this.passcodeFocus][0].select();
          });
        }
      });

      // view
      document.ondragstart = () => { return false; };
      if('ontouchstart' in document.body) {
        document.body.ontouchstart = this.TouchStart;
        document.body.ontouchend = this.TouchEnd;
        this.Position = this.TouchPosition;
      } else {
        document.body.onmousedown = this.TouchStart;
        document.body.onmouseup = this.TouchEnd;
        this.Position = this.MousePosition;
      }

      // key event
      window.addEventListener('keydown', (e) => {
        if(e.altKey) {
          this.logoTimer = setTimeout(() => {
            if((this.selectedTab !== '/debug_panel') || !this.debug)
              this.debug = !this.debug;
          }, 1500);
        }
      });
      window.addEventListener('keyup', (e) => {
        if(!e.altKey) {
          if(this.logoTimer) clearTimeout(this.logoTimer);
        }
      });
      window.addEventListener('resize', () => {
        this.debug = false;
      });
    },
    methods: {
      Passcode(d) {
        this.passcodeFocus = d - 1;
        if((this.passcode[d-1] > '9') || (this.passcode[d-1] < '0')) {
          this.passcode[d-1] = '';
        } else {
          this.passcodeFocus++;
          if(this.passcodeFocus === 6) {
            this.passcodeFocus = 0;
            let code = '';
            for(d of this.passcode) {
              code += d;
            }
            Socket.emit('authConfirm', {
              type: 'authConfirm',
              passcode: code,
            });
          }
          this.$refs['passcode' + this.passcodeFocus][0].focus();
          this.$refs['passcode' + this.passcodeFocus][0].select();
        }
      },
      RejectAuth() {
        Socket.emit('authConfirm', {
          type: 'authConfirm',
          passcode: '',
        });
      },
      Click(e) {
        let timeout = 8000;
        this.selectedTab = e.to;
        if(this.selectedTab.indexOf('/remocon') >= 0) timeout = 0;
        Common.emit('toastr_clear', this);
        Common.emit('toastr_timeout', this, timeout);
      },
      TouchLogoStart() {
        this.logoTimer = setTimeout(() => {
          this.debug = !this.debug;
        }, 1500);
      },
      TouchLogoEnd() {
        if(this.logoTimer) clearTimeout(this.logoTimer);
        this.logoTimer = null;
      },
      TouchStart(e) {
        this.touchStartPos = this.Position(e);
        this.touched = true;
      },
      TouchEnd(e) {
        if(!this.touched) return;
        this.touched = false;
        const pos = this.Position(e);
        const flickX = (pos[0] - this.touchStartPos[0]);
        const flickY = (pos[1] - this.touchStartPos[1]);
        if(Math.abs(flickX) / document.body.clientWidth < 0.25) return;
        if(Math.abs(flickX) < Math.abs(flickY) * 3) return;

        let n = 0;
        for(let i = 0; i < this.links.length; i++) {
          if(this.links[i] === this.$route.path) n = i;
        }

        if(flickX > 0) {
          n = n - 1;
          if(n < 0) n = 0;
          this.$router.push(this.links[n]);
        } else {
          n = n + 1;
          if(n >= this.links.length) n = this.links.length - 1;
          this.$router.push(this.links[n]);
        }
      },
      TouchPosition(e) {
        return [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
      },
      MousePosition(e) {
        return [e.clientX, e.clientY];
      },
    },
  };
</script>

<style scoped>
  /* for mobile device */
  .main-container {
    margin: 0 1vw;
    margin-top: 50px;
    overflow-y: scroll;
  }

  .main-container .el-container {
    width: 98vw;
    height: calc(100vh - 120px);
    display: block;
  }

  .main-container .el-container .el-aside, .main-container .el-container .el-main {
    position: relative;
  }
  
  /* for PC */
  @media only screen
         and (min-width: 768px) {

    #top-bar {
      font-size: 1.2vw;
    }

    .main-container {
      margin-top: 90px;
      overflow: hidden;
    }

    .main-container .el-container {
      height: calc(100vh - 90px);
      display: flex;
    }
  }
</style>


