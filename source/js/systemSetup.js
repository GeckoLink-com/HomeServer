/*

  frontend/js/systemSetup.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue'
import VueStrap from 'vue-strap'
import jsSHA from 'jssha'
import SlideSwitch from './SlideSwitch.vue'
import ViewSystemSetup from '../view/systemSetup.html'

class SystemSetup {

  constructor(common) {

    this._common = common;
    this._reader = new FileReader();

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.On(this._common.events.changeSystemConfig, (_caller) => {
      this._serverKeys = this._common.systemConfig.serverKeys;
      this._sshKeys = this._common.systemConfig.sshKeys;
      this._vue.passwordValid = this._common.systemConfig.password && this._common.systemConfig.initialPassword && (this._common.systemConfig.password != this._common.systemConfig.initialPassword);
      this._vue.smartMeter = this._common.systemConfig.smartMeter;
      this._SetSystemConfig();
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_systemSetup').innerHTML = ViewSystemSetup;
      this._vue = new Vue({
        el: '#tab_systemSetup',
        data: {
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
          radius: '',
          authLoadModal: false,
          configLoadModal: false,
          configInitModal: false,
        },
        computed: {
          accountOK: function() {
            if(this.account.length >= 4) {
              if(this.account == 'admin') {
                if(!this.passwordValid &&
                  (this.password1 == 'dummypasswd') &&
                  (this.password2 == 'dummypasswd')) {
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
          passwordOK: function() {
            if((this.password1 == this.password2) && (this.password1.length >= 8)) {
              if(this.password1 == 'dummypasswd') {
                if(!this.passwordValid &&
                  (this.account == 'admin')) {
                  return {
                    success: false,
                    error: true,
                  }
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
          }
        },
        methods: {
          AuthSave: () => {
            const dt = new Date();
            this._authSave.href = this._authSave.origin +
              '/auth/gecko_' + 
              dt.getFullYear()+
              ('0' + (dt.getMonth() + 1)).slice(-2) +
              ('0' + dt.getDate()).slice(-2) +
              '.sconf';
            this._authSave.click();
          },
          AuthLoad: () => {
            this._vue.authLoadModal = false;
            this._authLoad.click();
          },
          AuthLoadFile: () => {
            this._reader.onloadend = (e) => {
              if(e.target.readyState == FileReader.DONE) {
                socket.emit(this._common.eventToBackend.setAuth, this._reader.result);
                this._Reload();
              } else {
                toastr.error('ファイルが読み込めません。');
              }
            };
            this._reader.readAsArrayBuffer(this._authLoad.files[0]);
          },
          ConfigSave: () => {
            const dt = new Date();
            this._configSave.href = this._configSave.origin +
              '/config/gecko_' + 
              dt.getFullYear()+
              ('0' + (dt.getMonth() + 1)).slice(-2) +
              ('0' + dt.getDate()).slice(-2) +
              '.gconf';
            this._configSave.click();
          },
          ConfigLoad: () => {
            this._vue.configLoadModal = false;
            this._configLoad.click();
          },
          ConfigLoadFile: () => {
            this._reader.onloadend = (e) => {
              if(e.target.readyState == FileReader.DONE) {
                socket.emit(this._common.eventToBackend.setConfig, this._reader.result);
                this._Reload();
              } else {
                toastr.error('ファイルが読み込めません。');
              }
            };
            this._reader.readAsArrayBuffer(this._configLoad.files[0]);
          },
          ConfigInit: () => {
            this._vue.configInitModal = false;
            socket.emit(this._common.eventToBackend.initConfig);
            this._Reload();
          },
          RemoteKeyFile: () => {
            this._remoteKeyFile.click();
          },
          UploadRemoteKeyFile: () => {
            this._reader.onloadend = (e) => {
              if(e.target.readyState == FileReader.DONE) {
                this._serverKeys = this._reader.result;
              } else {
                toastr.error('ファイルが読み込めません。');
              }
            };
            this._reader.readAsArrayBuffer(this._remoteKeyFile.files[0]);
          },
          SSHKeyFile: () => {
            this._sshKeyFile.click();
          },
          UploadSSHKeyFile: () => {
            this._reader.onloadend = (e) => {
              if(e.target.readyState == FileReader.DONE) {
                this._sshKeys = this._reader.result;
              } else {
                toastr.error('ファイルが読み込めません。');
              }
            };
            this._reader.readAsText(this._sshKeyFile.files[0]);
          },
          Submit: this._ValidateValue.bind(this),
        },
        components: {
          'slide-switch' : SlideSwitch,
          'modal' : VueStrap.modal,
        },
      });
      this._authLoad = document.getElementById('auth-load');
      this._authSave = document.getElementById('auth-save');
      this._configLoad = document.getElementById('config-load');
      this._configSave = document.getElementById('config-save');
      this._remoteKeyFile = document.getElementById('remote-keyfile');
      this._sshKeyFile = document.getElementById('ssh-keyfile');
      this._SetSystemConfig();
    });
  }

  _SetSystemConfig() {
    if(!this._vue || !this._common.systemConfig) return;
    this._vue.version = this._common.systemConfig.version;
    this._vue.account = this._common.systemConfig.account;
    this._vue.remote = this._common.systemConfig.remote;
    this._vue.proxy = this._common.systemConfig.proxy;
    this._vue.mailto = this._common.systemConfig.mailto;
    this._vue.amesh = this._common.systemConfig.amesh;
    this._vue.latitude = this._common.systemConfig.latitude;
    this._vue.longitude = this._common.systemConfig.longitude;
    this._vue.radius = this._common.systemConfig.radius;
    this._vue.autoUpdate = this._common.systemConfig.autoUpdate;
  }

  _Reload() {
    setTimeout(() => {location.reload();}, 3000);
  }

  _ValidateValue() {

    if(this._vue.account.length < 4) {
      toastr.error('アカウント名が短すぎます。');
      return;
    }
    if(this._vue.password1 != this._vue.password2) {
      toastr.error('パスワードが合っていません。');
      return;
    }
    if(this._vue.password1.length < 8) {
      toastr.error('パスワードが短すぎます。');
      return;
    }

    toastr.clear();
    this._common.systemConfig.account = this._vue.account;
    if(this._vue.password1 != 'dummypasswd') {
      let sha256 = new jsSHA('SHA-256', 'TEXT');
      sha256.update(this._vue.account + this._vue.password1);
      const digest = sha256.getHash("HEX");
      this._common.systemConfig.password = digest;
    }
    this._common.systemConfig.remote = this._vue.remote;
    this._common.systemConfig.proxy = this._vue.proxy;
    this._common.systemConfig.mailto = this._vue.mailto;
    this._common.systemConfig.latitude = this._vue.latitude;
    this._common.systemConfig.longitude = this._vue.longitude;
    this._common.systemConfig.radius = this._vue.radius;
    this._common.systemConfig.autoUpdate = this._vue.autoUpdate;
    this._common.systemConfig.serverKeys = this._serverKeys;
    this._common.systemConfig.sshKeys = this._sshKeys;
    socket.emit(this._common.eventToBackend.systemConfig, this._common.systemConfig);
    toastr.success('設定しました。');
  }

}

export default SystemSetup;
