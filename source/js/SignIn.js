/*

  frontend/js/SignIn

  Copyright (C) 2018 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import { Row, Col, Button } from 'element-ui';
import lang from 'element-ui/lib/locale/lang/ja';
import locale from 'element-ui/lib/locale';
locale.use(lang);
Vue.prototype.$ELEMENT = { size: 'mini' };
Vue.use(Row);
Vue.use(Col);
Vue.use(Button);

import SocketClient from 'Socket.io-client';

import Common from './Common.js';
import SignIn from '../vue/SignIn.vue';

// css
import 'element-ui/lib/theme-chalk/base.css';
import '../css/localStyle.css';

class SignInWrapper {
  constructor() {
    global.Socket = SocketClient();
    global.Common = new Common();

    document.addEventListener('DOMContentLoaded', (ev) => {
      // IE Error
      const ua = window.navigator.userAgent.toLowerCase();
      if((ua.indexOf('msie') > 0) ||
         (ua.indexOf('trident/7') > 0)) {
        document.body.innerHTML = '<h2><br>このページはHTML5ブラウザのみの対応です。<br>申し訳ありませんがChrome/Safari/Firefoxでアクセスしてください。<br></h2>';
        return;
      }

      // vue
      new Vue({
        template: '<sign-in/>',
        components: { 'sign-in': SignIn },
      }).$mount('#app');
    });
  }
}
new SignInWrapper();
