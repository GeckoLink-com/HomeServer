/*

  frontend/js/toastr.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import VueStrap from 'vue-strap';
import ViewToastr from '../view/toastr.html';

class Toastr {
  constructor() {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('toast-container').innerHTML = ViewToastr;
      this._vue = new Vue({
        el: '#toast-container',
        data: {
          messages: [],
          defaultTimeout: 5000,
          defaultType: 'info',
          key: 1,
        },
        methods: {
          add: function(msg, type, timeout) {
            if(!type) type = this.defaultType;
            if(timeout == null) timeout = this.defaultTimeout;
            const data = {
              text: msg,
              timeout: timeout,
              type: type,
              key: this.key++,
            };
            this.messages.unshift(data);
            if(this.messages.length > 4) this.messages.pop();
            if(timeout !== 0) {
              setTimeout((d) => {
                for(const i in this.messages) {
                  if(this.messages[i] === d) {
                    this.messages.splice(i, 1);
                    break;
                  }
                }
              }, timeout, data);
            }
          },
          clear: function() {
            this.messages = [];
          },
          timeout: function(timeout) {
            this.defaultTimeout = timeout;
          },
        },
        components: {
          'alert': VueStrap.alert,
        },
      });
    });
  }

  success(msg, timeout) {
    if(this._vue) this._vue.add(msg, 'success', timeout);
  }
  warning(msg, timeout) {
    if(this._vue) this._vue.add(msg, 'warning', timeout);
  }
  info(msg, timeout) {
    if(this._vue) this._vue.add(msg, 'info', timeout);
  }
  error(msg, timeout) {
    if(this._vue) this._vue.add(msg, 'danger', timeout);
  }
  clear() {
    if(this._vue) this._vue.clear();
  }
  timeout(timeout) {
    if(this._vue) this._vue.timeout(timeout);
  }
}

export default Toastr;
