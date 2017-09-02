/*

  frontend/js/homeServer.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

const socket = require('socket.io-client')();
const Vue = require('vue');
const VueStrap = require('vue-strap');
const Toastr = require('./toastr.js');
const Common = require('./common.js');
const SystemSetup = require('./systemSetup.js');
const Pairing = require('./pairing.js');
const BasicSetup = require('./basicSetup.js');
const AdvancedSetup = require('./advancedSetup.js');
const ModuleList = require('./moduleList.js');
const LinkDevices = require('./linkDevices.js');
const Remocon = require('./remocon.js');
const RemoconMacro = require('./remoconMacro.js');
const RemoconAircon = require('./remoconAircon.js');
const RemoconTV = require('./remoconTV.js');
const UISetting = require('./uiSetting.js');
const DebugPanel = require('./debugPanel.js');

// css
require('../css/bootstrap.css');
require('../css/localStyle.css');

const webpackFileCopy = {
  index: require('../index.html'),
  red: require('../red/theme/css/nodeRed.css'),
};

class HomeServer {

  constructor() {

    global.socket = socket;
    global.Vue = Vue;
    global.VueStrap = VueStrap;

    this._common = new Common();
    this._childrenTable = [
      {name:'systemSetup',   func:SystemSetup },
      {name:'pairing',       func:Pairing },
      {name:'basicSetup',    func:BasicSetup },
      {name:'advancedSetup', func:AdvancedSetup },
      {name:'moduleList',    func:ModuleList },
      {name:'linkDevices',   func:LinkDevices },
      {name:'remocon',       func:Remocon },
      {name:'remoconMacro',  func:RemoconMacro },
      {name:'remoconAircon', func:RemoconAircon },
      {name:'remoconTV',     func:RemoconTV },
      {name:'uiSetting',     func:UISetting },
      {name:'nodeRed',       func:null },
      {name:'debugPanel',    func:DebugPanel },
    ];

    for(let i in this._childrenTable) {
      const child = this._childrenTable[i];
      if(child.func) child.entity = new child.func(this._common, i);
    }
    this._vue = null;
    this._nodeRed = null;

    // socketIO event handler from backend
    socket.on(this._common.eventFromBackend.deviceInfo, (msg) => {
      this._common.devices = msg.data;
      this._common.Trigger(this._common.events.changeDevices, this);
      if(this._vue) {
        let f = false;
        for(let dev of this._common.devices) {
          if(dev.device == 'pairing') {
            if(dev.state == 'connect') {
              this._vue.module = true;
              f = true;
            } else {
              this._vue.module = false;
            }
          } else {
            if(dev.state == 'alive') f = true;
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

    socket.on(this._common.eventFromBackend.uiTable, (msg) => {
      this._common.uiTable = msg;
      this._common.Trigger(this._common.events.changeUITable, this);
    });

    socket.on(this._common.eventFromBackend.systemConfig, (data) => {
      this._common.systemConfig = data;
      this._common.Trigger(this._common.events.changeSystemConfig, this);
      if(!this._vue) return;
      this._vue.passwordValid = (data.password != '3b8d0b97514d2519c71664785a04e050d8090e7a616ec3c1374982d173e950ab');
      if(!this._vue.passwordValid) toastr.error('最初にアカウントとパスワードを設定してください。', 0);
    });

    // common event handler from frontend other view
    this._common.On(this._common.events.changeAlias, (caller) => {
      if(caller != this) socket.emit(this._common.eventToBackend.alias, this._common.alias);
    }, this);

    this._common.On(this._common.events.changeRemocon, (caller) => {
      if(caller != this) socket.emit(this._common.eventToBackend.remocon, this._common.remocon);
    }, this);

    this._common.On(this._common.events.changeUITable, (caller) => {
      if(caller != this) socket.emit(this._common.eventToBackend.uiTable, this._common.uiTable);
    }, this);

    // view
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab-bar').innerHTML = require('../view/homeServer.html');
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
          tab: VueStrap.tab
        },
      });

      this._nodeRed = document.getElementById('tab_nodeRed');
      this._DisplayTab(0);

      window.addEventListener('keydown', (e) => {
        if(e.altKey) this._vue.debug = true;
      });
      window.addEventListener('keyup', (e) => {
        if((this._selectedTab != 'debugPanel') &&
           (!e.altKey))
          this._vue.debug = false;
      });
      window.addEventListener('resize', () => {
        this._vue.debug = false;
      });
    });
  }

  _DisplayTab(tab) {

    for(let i in this._childrenTable) {
      if(tab == i) {
        document.getElementById('tab_' + this._childrenTable[i].name).style.display = 'block';
      } else {
        document.getElementById('tab_' + this._childrenTable[i].name).style.display = 'none';
      }
    }
    this._selectedTab = this._childrenTable[tab].name;
    toastr.clear();
    if(this._selectedTab != 'debugPanel') this._vue.debug = false;
    switch(this._selectedTab) {
    case 'remocon':
    case 'remoconMacro':
    case 'remoconAircon':
    case 'remoconTV':
      toastr.timeout(0);
      break;
    case 'nodeRed':
      if(this._nodeRed.innerHTML == '') {
        this._nodeRed.innerHTML = '<iframe src="/red/" id="node-red" scrolling="no" frameborder="no"></iframe>';
      }
    default:
      toastr.timeout(8000);
    }
    this._common.Trigger(this._common.events.changeTab, this);
  }

}
global.Server = new HomeServer();

