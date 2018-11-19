/*

  frontend/js/HomeServer.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import { Container, Aside, Main, Row, Col, Button } from 'element-ui';
import lang from 'element-ui/lib/locale/lang/ja';
import locale from 'element-ui/lib/locale';

locale.use(lang);
Vue.prototype.$ELEMENT = { size: 'mini' };
Vue.use(Container);
Vue.use(Aside);
Vue.use(Main);
Vue.use(Row);
Vue.use(Col);
Vue.use(Button);

import SocketClient from 'Socket.io-client';

import Common from './Common.js';
import TopMenu from '../vue/TopMenu.vue';

// css
import '../red/theme/css/nodeRed.css';
import 'element-ui/lib/theme-chalk/base.css';
import 'element-ui/lib/theme-chalk/container.css';
import 'element-ui/lib/theme-chalk/aside.css';
import 'element-ui/lib/theme-chalk/main.css';
import 'element-ui/lib/theme-chalk/row.css';
import 'element-ui/lib/theme-chalk/col.css';
import 'element-ui/lib/theme-chalk/button.css';
import '../css/localStyle.css';

// for webpack
import '../index.html';
import '../images/GeckoIcon.png'; // for apple-icon
import '../images/GeckoIcon.ico'; // for favicon

class HomeServer {
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
        template: '<top-menu/>',
        components: { 'top-menu': TopMenu },
      }).$mount('#app');
    });
  }
}
new HomeServer();
