/*

  frontend/js/homeServer.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import VueStrap from 'vue-strap';
import Common from './common.js';

import SystemSetup from './systemSetup.js';
import Pairing from './pairing.js';
import BasicSetup from './basicSetup.js';
import AdvancedSetup from './advancedSetup.js';
import ModuleList from './moduleList.js';
import LinkDevices from './linkDevices.js';
import Remocon from './remocon.js';
import RemoconMacro from './remoconMacro.js';
import RemoconAircon from './remoconAircon.js';
import RemoconTV from './remoconTV.js';
import UISetting from './uiSetting.js';
import DebugPanel from './debugPanel.js';
import ViewHomeServer from '../view/homeServer.html';

// css
import '../css/bootstrap.css';
import '../css/localStyle.css';

// for webpack
import '../index.html';
import '../red/theme/css/nodeRed.css';

class HomeServer {
  constructor() {
    this._common = new Common();
    this._childrenTable = [
      { name: 'systemSetup', Func: SystemSetup },
      { name: 'pairing', Func: Pairing },
      { name: 'basicSetup', Func: BasicSetup },
      { name: 'advancedSetup', Func: AdvancedSetup },
      { name: 'moduleList', Func: ModuleList },
      { name: 'linkDevices', Func: LinkDevices },
      { name: 'remocon', Func: Remocon },
      { name: 'remoconMacro', Func: RemoconMacro },
      { name: 'remoconAircon', Func: RemoconAircon },
      { name: 'remoconTV', Func: RemoconTV },
      { name: 'uiSetting', Func: UISetting },
      { name: 'nodeRed', Func: null },
      { name: 'debugPanel', Func: DebugPanel },
    ];

    for(const i in this._childrenTable) {
      const child = this._childrenTable[i];
      if(child.Func) child.entity = new child.Func(this._common, i);
    }
    this._vue = null;
    this._nodeRed = null;

    // socketIO event handler from backend
    socket.on(this._common.eventFromBackend.deviceInfo, (msg) => {
      this._common.devices = msg.data;
      this._common.Trigger(this._common.events.changeDevices, this);
      if(this._vue) {
        let f = false;
        for(const dev of this._common.devices) {
          if(dev.device === 'pairing') {
            if(dev.state === 'connect') {
              this._vue.module = true;
              f = true;
            } else {
              this._vue.module = false;
            }
          } else {
            if(dev.state === 'alive') f = true;
          }
        }
        this._vue.moduleMenu = f;
      }
    });

    socket.on(this._common.eventFromBackend.alias, (msg) => {
      this._common.alias = msg;
      this._common.Trigger(this._common.events.changeAlias, this);
    });

    socket.on(this._common.eventFromBackend.remocon, (msg) => {
      this._common.remocon = msg;
      this._common.Trigger(this._common.events.changeRemocon, this);
    });

    socket.on(this._common.eventFromBackend.hueBridges, (data) => {
      this._common.hueBridges = data;
      this._common.Trigger(this._common.events.changeHueBridges, this);
    });

    socket.on(this._common.eventFromBackend.smartMeter, (data) => {
      this._common.smartMeter = data;
      this._common.Trigger(this._common.events.changeSmartMeter, this);
    });

    socket.on(this._common.eventFromBackend.uiTable, (msg) => {
      this._common.uiTable = msg;
      this._common.Trigger(this._common.events.changeUITable, this);
    });

    socket.on(this._common.eventFromBackend.systemConfig, (data) => {
      this._common.systemConfig = data;
      this._common.Trigger(this._common.events.changeSystemConfig, this);
      if(!this._vue) return;
      this._vue.passwordValid = (data.password !== '3b8d0b97514d2519c71664785a04e050d8090e7a616ec3c1374982d173e950ab');
      if(!this._vue.passwordValid) toastr.error('最初にアカウントとパスワードを設定してください。', 0);
    });

    // common event handler from frontend other view
    this._common.On(this._common.events.changeAlias, (caller) => {
      if(caller !== this) socket.emit(this._common.eventToBackend.alias, this._common.alias);
    }, this);

    this._common.On(this._common.events.changeRemocon, (caller) => {
      if(caller !== this) socket.emit(this._common.eventToBackend.remocon, this._common.remocon);
    }, this);

    this._common.On(this._common.events.changeUITable, (caller) => {
      if(caller !== this) socket.emit(this._common.eventToBackend.uiTable, this._common.uiTable);
    }, this);

    // view
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab-bar').innerHTML = ViewHomeServer;
      this._vue = new Vue({
        el: '#tab-bar',
        data: {
          activeTab: 0,
          module: false,
          moduleMenu: false,
          debug: false,
          passwordValid: false,
        },
        methods: {
          ChangeTab: this._DisplayTab.bind(this),
        },
        components: {
          navbar: VueStrap.navbar,
          tabs: VueStrap.tabs,
          tabGroup: VueStrap.tabGroup,
          tab: VueStrap.tab,
        },
      });

      this._nodeRed = document.getElementById('tab_nodeRed');
      this._DisplayTab(0);

      window.addEventListener('keydown', (e) => {
        if(e.altKey) this._vue.debug = true;
      });
      window.addEventListener('keyup', (e) => {
        if((this._selectedTab !== 'debugPanel') && (!e.altKey)) {
          this._vue.debug = false;
        }
      });
      window.addEventListener('resize', () => {
        this._vue.debug = false;
      });
    });
  }

  _DisplayTab(tab) {
    for(const i in this._childrenTable) {
      if(parseInt(tab) === parseInt(i)) {
        document.getElementById('tab_' + this._childrenTable[i].name).style.display = 'block';
      } else {
        document.getElementById('tab_' + this._childrenTable[i].name).style.display = 'none';
      }
    }
    this._selectedTab = this._childrenTable[tab].name;
    toastr.clear();
    if(this._selectedTab !== 'debugPanel') this._vue.debug = false;
    switch (this._selectedTab) {
      case 'remocon':
      case 'remoconMacro':
      case 'remoconAircon':
      case 'remoconTV':
        toastr.timeout(0);
        break;
      case 'nodeRed':
        if(this._nodeRed.innerHTML === '') {
          this._nodeRed.innerHTML = '<iframe src="/red/" id="node-red" scrolling="no" frameborder="no"></iframe>';
        }
        toastr.timeout(8000);
        // fallthrough
      default:
        toastr.timeout(8000);
    }
    this._common.Trigger(this._common.events.changeTab, this);
  }
}

new HomeServer();

