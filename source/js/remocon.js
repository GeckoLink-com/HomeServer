/*

  frontend/js/remocon.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue'
import VueStrap from 'vue-strap'
import ViewRemocon from '../view/remocon.html'

class Remocon {

  constructor(common) {

    this._common = common;
    this._reader = new FileReader();

    socket.on(this._common.eventFromBackend.events, (msg) => {
      if((msg.type != 'irreceive') || !this._vue) return;
      const code = this._common.RemoconSearch(msg.data[0].code);
      const data = {
        name: msg.data[0].name,
        code: msg.data[0].code,
        deviceName: msg.data[0].deviceName,
        format: msg.data[0].format,
        info: code.name?(code.name+' ' + code.comment):code.code,
      };
      Vue.set(this._vue.lastRemoconCode, data.deviceName, data);
      this._vue.selectedItem = null;
    });
    this._common.On(this._common.events.changeRemocon, () => {
      if(this._vue) this._vue.remocon = this._common.remocon;
    });
    this._common.On(this._common.events.changeTab, () => {
      if(this._vue) this._vue.selectedIdx = null;
    }, this);
    
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_remocon').innerHTML = ViewRemocon;
      this._vue = new Vue({
        el: '#tab_remocon',
        data: {
          remocon: this._common.remocon,
          lastRemoconCode: {},
          name: '',
          nameValid: false,
          comment: '',
          commentValid: false,
          nameAlert: '',
          commentAlert: '',
          selectedGroup: null,
          selectedItem: null,
          selectedIdx: null,
        },
        methods: {
          Save: () => {
            const dt = new Date();
            this._remoconSave.href = this._remoconSave.origin +
              '/remocon/gecko_remocon_' + 
              dt.getFullYear()+
              ('0' + (dt.getMonth() + 1)).slice(-2) +
              ('0' + dt.getDate()).slice(-2) +
              '.json.gz';
            this._remoconSave.click();
          },
          Load: () => {
            this._remoconLoad.click();
          },
          LoadFile: () => {
            this._reader.onloadend = (e) => {
              if(e.target.readyState == FileReader.DONE) {
                socket.emit(this._common.eventToBackend.addRemocon, this._reader.result);
              } else {
                toastr.error('ファイルが読み込めません。');
              }
            };
            this._reader.readAsArrayBuffer(this._remoconLoad.files[0]);
          },
          Decode: (code) => {
            return this._common.RemoconSearch(code).code;
          },
          SelectRemocon: function(item) {
            this.selectedItem = item;
            this.name = item.name;
            this.NameCheck();
            this.comment = item.comment;
            this.CommentCheck();
            console.log(this.name, this.comment);
          },
          NameCheck: function() {
            if(!this.name ||(this.name.length < 4)) {
              this.nameValid = false;
              this.nameAlert = '登録名を4文字以上で入れてください。';
              return;
            }
            if(this.remocon.remoconTable[this.name]) {
              if(this.remocon.remoconTable[this.name].group) {
                this.nameValid = false;
                this.nameAlert = 'エアコン・テレビのコード名と同じ名前は登録できません。';
                return;
              }
              this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？';
              if(this.comment.length == 0) this._vue.comment = this.remocon.remoconTable[i].comment;
            } else {
              this.nameAlert = '';
            }
            this.nameValid = true;
          },
          CommentCheck: function() {
            if(!this.comment || (this.comment.length == 0)) {
              this.commentValid = false;
              this.commentAlert = 'コメントを入れてください。';
              return;
            }
            this.commentValid = true;
            this.commentAlert = '';
          },
          Cancel: function() {
            toastr.clear();
            this.selectedItem = null;
          },
          Submit: () => {
            if(!this._vue.nameValid || !this._vue.commentValid) return;
            this._vue.nameAlert = '';
            this._vue.commentAlert = '';
            const name = this._vue.name;
            const comment = this._vue.comment;
            const code = this._vue.selectedItem.code;
            this._vue.remocon.remoconTable[name] = {comment:comment, code:code};
            this._common.Trigger(this._common.events.changeRemocon /* , this */);
            toastr.clear();
            this._vue.selectedItem = null;
          },
          DeleteItem: (item, idx) => {
            this._vue.selectedGroup = null;
            this._vue.selectedIdx = null;
            delete this._vue.remocon.remoconTable[idx];
            this._common.Trigger(this._common.events.changeRemocon /* , this */);
          },
          DeleteGroup: (group) => {
            this._vue.selectedGroup = null;
            this._vue.selectedIdx = null;
            for(let i in this._vue.remocon.remoconTable) {
              if(this._vue.remocon.remoconTable[i].group == group) {
                delete this._vue.remocon.remoconTable[i];
              }
            }
            delete this._vue.remocon.remoconGroup[group];
            this._common.Trigger(this._common.events.changeRemocon /* , this */);
          },
          IsSelect: function(item, idx) {
            if(!this.selectedIdx) return false;
            if(idx==this.selectedIdx) return true;
            if(!item.group||(item.group=='')) return false;
            if(!this.remocon.remoconTable[this.selectedIdx]) {
              this.selectedIdx = null;
              return false;
            }
            if(item.group!=this.remocon.remoconTable[this.selectedIdx].group) return false;
            return true;
          },
          IRSend: (item, idx) => {
            const code = this._vue.remocon.remoconTable[idx].code;
            let cmd = 'ir 01';
            for(let i = 0; i < code.length; i++) {
              cmd += ' ' + ('00' + code[i].toString(16)).slice(-2);
            }
            socket.emit(this._common.eventToBackend.command, {
              type:'command',
              device: 'server',
              command: cmd,
            });
          },
          SelectItem: function(idx) {
            this.selectedIdx = idx;
            this.selectedGroup = null;
          },
          SelectGroup: function(idx) {
            this.selectedIdx = null;
            this.selectedGroup = idx;
          },
          ClearSelect: function() {
            this.selectedIdx = null;
            this.selectedGroup = null;
          },
        },
        components: {
          'alert' : VueStrap.alert,
        },
      });
      this._remoconLoad = document.getElementById('remocon-load');
      this._remoconSave = document.getElementById('remocon-save');
    });
  }
}

export default Remocon;
