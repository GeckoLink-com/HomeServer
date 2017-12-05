/*

  frontend/js/HomeServer.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import SocketClient from 'Socket.io-client';

import Common from './Common.js';
import TopMenu from '../vue/TopMenu.vue';

// css
import '../css/bootstrap.css';
import '../css/localStyle.css';
import '../red/theme/css/nodeRed.css';

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
      var ua = window.navigator.userAgent.toLowerCase();
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
