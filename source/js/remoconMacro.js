/*

  frontend/js/remoconMacro.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import VueStrap from 'vue-strap';
import ViewRemoconMacro from '../view/remoconMacro.html';

class RemoconMacro {
  constructor(common) {
    this._common = common;

    socket.on(this._common.eventFromBackend.events, (msg) => {
      if((msg.type !== 'irreceive') || !this._vue) return;
      if(msg.data[0].deviceName !== 'server') return;
      if(this._vue.sequence < 1) return;

      const remoconCode = msg.data[0].code;
      const code = this._common.RemoconSearch(remoconCode);
      const now = new Date();
      if(this._vue.macro.length > 0) {
        let wait = now - this._lastEvent;
        wait = Math.ceil(wait / 100) / 10;
        this._vue.macro.push({
          wait: wait,
        });
      }
      this._vue.macro.push({
        label: code.name,
        code: remoconCode,
        info: code.code,
      });
      this._lastEvent = now;
      this._vue.dirty = true;
    });
    this._common.On(this._common.events.changeRemocon, () => {
      if(this._vue) this._vue.remocon = this._common.remocon;
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_remoconMacro').innerHTML = ViewRemoconMacro;
      this._vue = new Vue({
        el: '#tab_remoconMacro',
        data: {
          macro: [],
          remocon: this._common.remocon,
          selectedMacro: 'newMacro',
          name: '',
          nameValid: false,
          nameAlert: '登録名を4文字以上で入れてください。',
          comment: '',
          commentValid: false,
          commentAlert: 'コメントを入れてください。',
          dirty: false,
          sequence: 0,
          removeModal: false,
        },
        methods: {
          SelectMacro: () => {
            if(this._vue.selectedMacro === 'newMacro') {
              this._vue.name = '';
              this._vue.NameCheck();
              this._vue.comment = '';
              this._vue.CommentCheck();
              this._vue.macro = [];
            } else {
              this._vue.name = this._vue.selectedMacro;
              this._vue.nameValid = true;
              this._vue.comment = this._vue.remocon.remoconMacro[this._vue.name].comment;
              this._vue.commentValid = true;
              this._vue.macro = [];
              for(const item of this._vue.remocon.remoconMacro[this._vue.name].macro) {
                const code = this._common.RemoconSearch(item.code);
                this._vue.macro.push({
                  wait: item.wait,
                  label: item.label,
                  comment: item.comment,
                  code: item.code,
                  info: code.code,
                });
              }
            }
            Vue.nextTick(() => { this._vue.dirty = false; });
          },
          NameCheck: function() {
            if(this.name.length < 4) {
              this.nameValid = false;
              this.nameAlert = '登録名を4文字以上で入れてください。';
              return;
            }
            if(this.remocon.remoconMacro[this.name]) {
              this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？';
            } else {
              this.nameAlert = '';
            }
            this.nameValid = true;
            this.dirty = true;
          },
          CommentCheck: function() {
            if(this.comment.length === 0) {
              this.commentValid = false;
              this.commentAlert = 'コメントを入れてください。';
              return;
            }
            this.commentAlert = '';
            this.commentValid = true;
            this.dirty = true;
          },
          Start: function() {
            if(this.sequence !== 0) return;
            this.sequence = 1;
            toastr.info('リモコンの操作手順を順番に記録します。<br>リモコンのボタンは<strong>長押ししない</strong>で下さい。');
            this.nameAlert = '';
          },
          Cancel: function() {
            this.sequence = 0;
            this.dirty = false;
            this.SelectMacro();
            toastr.clear();
          },
          Submit: () => {
            if(!this._vue.nameValid || !this._vue.commentValid) return;
            if(!this._common.remocon.remoconMacro) this._common.remocon.remoconMacro = {};
            if((this._vue.name !== this._vue.selectedMacro) &&
               this._common.remocon.remoconMacro[this._vue.selectedMacro]) {
              delete this._common.remocon.remoconMacro[this._vue.selectedMacro];
            }
            this._common.remocon.remoconMacro[this._vue.name] = { comment: this._vue.comment, macro: this._vue.macro };
            this._common.Trigger(this._common.events.changeRemocon, this);
            this._vue.sequence = 0;
            this._vue.dirty = false;
            this._vue.selectedMacro = this._vue.name;
          },
          Remove: () => {
            this._vue.removeModal = false;
            if(this._vue.dirty) return;
            if(this._common.remocon.remoconMacro[this._vue.selectedMacro]) {
              delete this._common.remocon.remoconMacro[this._vue.selectedMacro];
            }
            this._common.Trigger(this._common.events.changeRemocon, this);
            this._vue.sequence = 0;
            this._vue.dirty = false;
            this._vue.selectedMacro = 'newMacro';
            this._vue.SelectMacro();
          },
        },
        components: {
          'modal': VueStrap.modal,
        },
      });
    });
  }
}

export default RemoconMacro;

