<template>
  <div class="container-fluid">
    <navbar placement="top" type="default" id="top-bar" class="nav-tabs" @click="Click">
      <div slot="brand">
        <img src="../images/GeckoLogo.png" class="logo"
          @mousedown="TouchLogoStart"
          @touchstart="TouchLogoStart"
          @mouseup="TouchLogoEnd"
          @touchend="TouchLogoEnd"/>
      </div>
      <ul class="nav nav-tabs">
        <li id="defaultTab" @click="Click" data-tab="systemSetup"><a>システム設定</a></li>
        <dropdown @click.native.capture="DropdownClick" text="子機設定" type="primary" :disabled="!moduleMenu || !passwordValid">
          <li @click="Click" data-tab="pairing" :class="{ disabled: !module || !moduleMenu || !passwordValid }"><a>ペアリング</a></li>
          <li @click="Click" data-tab="basicSetup" :class="{ disabled: !moduleMenu || !passwordValid }"><a>基本設定</a></li>
          <li @click="Click" data-tab="advancedSetup" :class="{ disabled: !moduleMenu || !passwordValid}"><a>詳細設定</a></li>
          <li @click="Click" data-tab="moduleList" :class="{ disabled: !moduleMenu || !passwordValid}"><a>子機一覧</a></li>
        </dropdown>
        <li @click="Click" data-tab="linkDevices" :class="{ disabled: !passwordValid }"><a>リンク機器</a></li>
        <dropdown @click.native.capture="DropdownClick" text="リモコン登録" type="primary" :class="{ disabled: !passwordValid }">
          <li @click="Click" data-tab="remocon" :class="{ disabled: !passwordValid }"><a>通常設定</a></li>
          <li @click="Click" data-tab="remoconMacro" :class="{ disabled: !passwordValid }"><a>マクロ登録・編集</a></li>
          <li @click="Click" data-tab="remoconAircon" :class="{ disabled: !passwordValid }"><a>エアコン設定</a></li>
          <li @click="Click" data-tab="remoconTV" :class="{ disabled: !passwordValid }"><a>テレビ設定</a></li>
        </dropdown>
        <li @click="Click" data-tab="uiSetting" :class="{ disabled: !passwordValid }"><a>UI設定</a></li>
        <li @click="Click" data-tab="nodeRED" :class="{ disabled: !passwordValid }"><a>プログラム</a></li>
        <li v-if="debug" @click="Click" data-tab="debugPanel" :class="{ disabled: !passwordValid }"><a>debug</a></li>
      </ul>

    </navbar>

    <system-setup :display="selectedTab==='systemSetup'"></system-setup>
    <pairing :display="selectedTab==='pairing'"></pairing>
    <basic-setup :display="selectedTab==='basicSetup'"></basic-setup>
    <advanced-setup :display="selectedTab==='advancedSetup'"></advanced-setup>
    <module-list :display="selectedTab=='moduleList'"></module-list>
    <link-devices :display="selectedTab==='linkDevices'"></link-devices>
    <remocon :display="selectedTab==='remocon'"></remocon>
    <remocon-macro :display="selectedTab==='remoconMacro'"></remocon-macro>
    <remocon-aircon :display="selectedTab==='remoconAircon'"></remocon-aircon>
    <remocon-tv :display="selectedTab==='remoconTV'"></remocon-tv>
    <ui-setting :display="selectedTab==='uiSetting'"></ui-setting>
    <node-red :display="selectedTab==='nodeRED'"></node-red>
    <debug-panel :display="selectedTab==='debugPanel'"></debug-panel>

    <toastr></toastr>
  </div>
</template>

<script>
  import VueStrap from 'vue-strap';
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
  import RemoconTV from './RemoconTV.vue';
  import UISetting from './UISetting.vue';
  import NodeRED from './NodeRED.vue';
  import DebugPanel from './DebugPanel.vue';

  export default {
    data() {
      return {
        activeTab: 0,
        module: false,
        moduleMenu: false,
        debug: false,
        passwordValid: false,
        selectedTab: 'systemSetup',
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
        if(e.altKey) this.debug = true;
      });
      window.addEventListener('keyup', (e) => {
        if((this.selectedTab !== 'debugPanel') && (!e.altKey)) {
          this.debug = false;
        }
      });
      window.addEventListener('resize', () => {
        this.debug = false;
      });
      this.lastTabElement = document.getElementById('defaultTab');
      this.lastTabElement.classList.add('active');
    },
    methods: {
      Click(el) {
        const pel = el.target.parentElement;
        if(pel.classList.contains('disabled')) return;

        let targetTab = pel;
        if(pel.parentElement.classList.contains('dropdown-menu')) {
          do {
            targetTab = targetTab.parentElement;
          } while(!targetTab.classList.contains('dropdown') && (targetTab !== document.body));
        }
        this.lastTabElement.classList.remove('active');
        targetTab.classList.add('active');
        this.lastTabElement = targetTab;
        this.selectedTab = pel.dataset.tab;
        let timeout = 8000;
        if(this.selectedTab.indexOf('remocon') >= 0) timeout = 0;
        Common.emit('toastr_clear', this);
        Common.emit('toastr_timeout', this, timeout);
      },
      DropdownClick(el) {
        if(el.target.parentElement.classList.contains('dropdown')) el.stopPropagation();
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
        var x = e.changedTouches[0].clientX;
        var y = e.changedTouches[0].clientY;
        return [x, y];
      },
      MousePosition(e) {
        var x = e.clientX;
        var y = e.clientY;
        return [x, y];
      },
    },
    components: {
      navbar: VueStrap.navbar,
      dropdown: VueStrap.dropdown,
      tabs: VueStrap.tabs,
      tabGroup: VueStrap.tabGroup,
      tab: VueStrap.tab,
      toastr: Toastr,
      systemSetup: SystemSetup,
      pairing: Pairing,
      basicSetup: BasicSetup,
      advancedSetup: AdvancedSetup,
      moduleList: ModuleList,
      linkDevices: LinkDevices,
      remocon: Remocon,
      remoconMacro: RemoconMacro,
      remoconAircon: RemoconAircon,
      remoconTv: RemoconTV,
      uiSetting: UISetting,
      nodeRed: NodeRED,
      debugPanel: DebugPanel,
    },
  };
</script>

<style scoped>
  /* for mobile device */
  #top-bar {
    float: right;
    position: fixed;
    z-index: 100;
    width: 100vw;
    top: 0px;
    border-width: 0;
    display: inline-block;
    color: rgba(93,93,93,0);
    background-color: rgba(255,255,255,0);
    transition: 1s;
  }

  #top-bar >>> .container {
    width: 100vw;
    padding: 0;
  }

  #top-bar >>> .logo {
    margin: 0.8% 1vw 0.5% 1vw;
    width: 18vw;
    max-width: 200px;
    min-width: 150px;
    display: inline-block;
  }

  #top-bar >>> .navbar-toggle {
    border: 0;
  }

  #top-bar >>> .navbar-toggle {
    border: 0;
  }

  #top-bar >>> .navbar-collapse li {
    display: list-item;
  }

  #top-bar >>> .navbar-collapse {
    float: right;
    background-color: rgba(255,255,255,0.8);
    font-size: 0.4vw;
    padding: 0;
    margin: 0;
    box-shadow:1px 1px 2px rgba(0, 0, 0, .2);
    border-style: none;
    max-height: none;
  }

  #top-bar >>> .navbar-nav {
    vertical-align: middle;
    cursor: default;
    line-height: 1.6em;
    margin: 0 0.5em;
  }

  .tab-bar {
    margin: 0;
    padding: 32px 10px 5px 10px;
    width: 70vw;
    font-size:1.6vw;
  }

  .tab-bar li a {
    padding: 0.1em 0.8vw;
  }

  .navbar {
    background-color:white;
    height: 80px;
    max-width: 1280px;
    width: 100%;
  }

  .navbar .container {
    width: 100vw;
    margin: 0;
    padding: 0;
  }

  .tab-panel {
    position: absolute;
    top: 80px;
    width: 98%;
    height: calc(100vh - 80px);
  }

  .dropdown-menu {
    font-size:1em;
    font-weight: 300;
    text-align: left;
  }

  .dropdown:hover:not(.disabled) .dropdown-menu {
    display: block;
  }

  .dropdown:not(:hover) .dropdown-menu {
    display: none;
  }

  #top-bar >>> .dropdown-toggle {
    display: none;
    text-align: center;
    line-height: 2.0em;
    margin: 0;
    padding: 0;
  }

  #top-bar >>> .dropdown-menu {
    text-align: center;
    line-height: 1.6em;
    margin: 0;
    padding: 0;
    background-color: rgba(0, 0, 0, 0);
    display: list-item;
    box-shadow: none;
    border-style: none;
    position: static;
    top: 100%;
    float: none;
    z-index: auto;
  }

  #top-bar >>> a {
    font-weight: unset;
    line-height: 1.6em;
    color: rgb(38, 103, 168);
    padding: 0;
    text-align: left;
  }

  #top-bar >>> a:hover {
    color: black;
    background-color: rgba(0, 0, 0, 0.2);
  }

  #top-bar >>> .dropdown-menu a:hover {
    color: black;
    background-color: rgba(0, 0, 0, 0.2);
  }

  #top-bar .disabled >>> a{
    color: rgb(93, 93, 93);
  }

  #top-bar .display-off >>> a {
    display: none;
  }

  /* for PC */
  @media only screen
         and (min-width: 768px) {

    #top-bar:hover {
      opacity: 1!important;
      background-color: rgba(255, 255, 255, 0.8)!important;
    }

    #top-bar >>> .navbar-collapse {
      float: none;
      background-color: rgba(0, 0, 0, 0);
      font-size: 1.4vw;
      box-shadow: none;
    }

    #top-bar >>> .navbar-nav {
      line-height: 2.0em;
      margin: 20px 0 0 0.5vw;
      width: 78vw;
    }

    #top-bar >>> a {
      font-size: 1em;
    }

    #top-bar >>> .nav li {
      margin-right: 0.1%;
      width: 13.8%;
    }

    #top-bar >>> .nav li a {
      text-align: center;
    }

    #top-bar >>> .dropdown-menu {
      text-align: left;
      position: absolute;
      box-shadow: rgba(0, 0, 0, 0.2) 0px 6px 12px 0px;
      background-color: rgba(255,255,255,0.85);
      display: none;
      font-size: 1em;
    }

    #top-bar >>> .dropdown-menu li {
      padding: 0;
      width: auto;
    }

    #top-bar >>> .dropdown-menu li a {
      text-align: left;
      padding: 0 0.5em;
      font-size: 1em;
    }

    #top-bar >>> .dropdown-toggle {
      display: block;
      text-align: center;
      line-height: 1.6em;
      margin: 0;
      padding: 0;
    }

    #top-bar >>> .dropdown:hover .dropdown-menu {
      display: inline-block;
    }

    #top-bar >>> .dropdown:not(hover) .dropdown-menu {
        display: none;
    }

    .nav .open>a {
      border-color: inherit;
    }

    .dropdown-menu>.active>a, .dropdown-menu>.active>a:focus, .dropdown-menu>.active>a:hover {
      background-color: inherit;
    }
  }
</style>


