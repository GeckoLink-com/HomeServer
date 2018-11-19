//
// HueAPI.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const request = require('request');
const ssdp = require('node-upnp-ssdp');

/*
  command device : hueBridge_light
          deviceName : alias_name
          func   : pairing,search,flash,ct,hue,switch
          param  : ct:ct(2000(500)-6500(153)) bri(0:off,1-254)
                   hue:hue(0-65535) sat(0-254) bri(0:off,1-254)
                   switch:on/off/toggle
*/

class HueAPI {

  constructor(common) {

    this.common = common;
    this.common.on('sendControllerCommand', (caller, msg) => {
      let device = '';
      if(this.common.aliasTable && msg.deviceName && (msg.deviceName in this.common.aliasTable)) {
        device = this.common.aliasTable[msg.deviceName].device;
      } else {
        device = msg.device || msg.deviceName;
      }
      if(!device.match(/^Hue_/)) return;

      const bridgeId = device.replace(/^Hue_/, '').replace(/_.*$/, '');
      const light = device.replace('Hue_' + bridgeId, '').replace(/^_/, '');
      let bridgeNo = -1;
      if(this.bridges) {
        for(const i in this.bridges) {
          if(this.bridges[i].id == bridgeId) bridgeNo = i;
        }
      }

      const args = msg.command.split(/[ \t]/);
      switch(args[0]) {
      case 'pairing':
        this.Pairing(msg, bridgeNo, {devicetype: "geckolink"}, this.RegistBridge.bind(this));
        break;
      case 'search':
        this.SearchLights(msg, bridgeNo, false);
        break;
      case 'touchlink':
        this.SearchLights(msg, bridgeNo, true);
        break;
      case 'flash':
        if(light && (light != '')) this.BlinkLight(msg, bridgeNo, light);
        break;
      case 'delete':
        console.log('delete', bridgeNo, light);
        if(light && (light != '')) this.DeleteLight(msg, bridgeNo, light, () => {
            delete this.bridges[bridgeNo].lights[light];
            this.common.emit('changeHueBridges', this);
          });
        break;
      case 'name':
        if(light && (light != '')) this.SetName(msg, bridgeNo, light, {name: args[1]}, () => {
            this.GetFullState(msg, bridgeNo, this.FullState.bind(this));
          });
        break;
      case 'ct':
        if(!args[1] || (args[1] > 6500)) {
          console.log('ct illegal parameter ct:', args[1]);
          this.SendResponse(msg, true);
          return;
        }
        if(!args[2] || (args[2] > 254)) {
          console.log('ct illegal parameter bri:', args[2]);
          this.SendResponse(msg, true);
          return;
        }
        if((args[1] < 0) && (args[2] < 0)) {
          console.log('ct illegal parameter ct and bri:', args[1], args[2]);
          this.SendResponse(msg, true);
          return;
        }
        if(light && (light != '')) {
          const state = {
            on: true,
            ct: this.bridges[bridgeNo].lights[light].state.ct,
            hue: this.bridges[bridgeNo].lights[light].state.hue,
            sat: this.bridges[bridgeNo].lights[light].state.sat,
            bri: this.bridges[bridgeNo].lights[light].state.bri,
            alert: 'none',
            transitiontime: 0
          };
          if(this.bridges[bridgeNo].lights[light].state.colormode == 'hs') {
            state.ct = null;
          } else {
            state.hue = null;
          }
          if(args[1] >= 0) state.ct = parseInt(1000000 / args[1]);
          if(args[2] >= 0) state.bri = parseInt(args[2]);
          this.SetLight(msg, bridgeNo, light, state);
        }
        break;
      case 'hue':
        if(!args[1] || (args[1] > 65535)) {
          console.log('hue illegal parameter hue:', args[1]);
          this.SendResponse(msg, true);
          return;
        }
        if(!args[2] || (args[2] > 254)) {
          console.log('hue illegal parameter sat:', args[2]);
          this.SendResponse(msg, true);
          return;
        }
        if(!args[3] || (args[3] > 254)) {
          console.log('hue illegal parameter bri:', args[3]);
          this.SendResponse(msg, true);
          return;
        }
        if((args[1] < 0) && (args[2] < 0) && (args[3] < 0)) {
          console.log('hue illegal parameter hue, sat and bri:', args[1], args[2], args[3]);
          this.SendResponse(msg, true);
          return;
        }
        if(light && (light != '')) {
          const state = {
            on: true,
            ct: null,
            hue: this.bridges[bridgeNo].lights[light].state.hue,
            sat: this.bridges[bridgeNo].lights[light].state.sat,
            bri: this.bridges[bridgeNo].lights[light].state.bri,
            alert: 'none',
            transitiontime: 0
          };
          if(args[1] >= 0) state.hue = parseInt(args[1]);
          if(args[2] >= 0) state.sat = parseInt(args[2]);
          if(args[3] >= 0) state.bri = parseInt(args[3]);
          this.SetLight(msg, bridgeNo, light, state);
        }
        break;
      case 'switch':
        if(light && (light != '')) {
          const state = {
            on: this.bridges[bridgeNo].lights[light].state.on,
            ct: this.bridges[bridgeNo].lights[light].state.ct,
            hue: this.bridges[bridgeNo].lights[light].state.hue,
            sat: this.bridges[bridgeNo].lights[light].state.sat,
            bri: this.bridges[bridgeNo].lights[light].state.bri,
            alert: 'none',
            transitiontime: 0
          };
          if(args[1] == 'on') state.on = true;
          if(args[1] == 'off') state.on = false;
          if(args[1] == 'toggle') state.on = !state.on;
          this.SetLight(msg, bridgeNo, light, state);
        }
        break;
      default:
        console.log('hue command error ', args[0]);
      }
    });
    this.common.on('changeHueBridges', (caller) => {
      if(caller == this) return;
      if(!this.common.hueBridges) this.common.hueBridges = [];
      this.bridges = this.common.hueBridges;
  /*
    hueBridges = [
      { id: deviceID, ip: ipaddr, lastIp: lastIp , message: msg, state: num(0:nolink/1:link/2:busy), user: user}
    ]
  */

      for(const bridge of this.bridges) {
        bridge.lastIp = bridge.ip;
        bridge.ip = null;
      }

      ssdp.on('DeviceFound', (info) => {
        if((info.server.search(/IpBridge/) >= 0) &&
           (info.st.search(/rootdevice/) >= 0)) {
          let ip = info.location.replace(/^.*http:\/\//,'').replace(/:.*$/,'');
          let id = info.usn.replace(/^.*-/,'').replace(/:.*$/,'').slice(-6);
          let no = -1;
          for(const i in this.bridges) {
            if(this.bridges[i].id == id) no = i;
          }
          if(no < 0) {
            this.bridges.push({id: id, ip: ip, state: 0});
            no = this.bridges.length - 1;
          } else {
            this.bridges[no].ip = ip;
          }
        }
      });
      ssdp.mSearch('ssdp:root');

      request.get({url:'https://www.meethue.com/api/nupnp', json:true}, (err, res, body) => {
        if(err) return;
        for(const device of body) {
          const id = device.id.slice(-6);
          const ip = device.internalipaddress;
          let no = -1;
          for(const i in this.bridges) {
            if(this.bridges[i].id == id) no = i;
          }
          if(no < 0) {
            this.bridges.push({id: id, ip: ip});
          } else {
            this.bridges[no].ip = ip;
          }
        }
      });
      
      setTimeout(() => {
        for(const i in this.bridges) {
          const bridge = this.bridges[i];
          if(!bridge.ip) bridge.ip = bridge.lastIp;
          if(bridge.user) {
            this.bridges[i].message = '';
            this.bridges[i].state = 2; 
            this.common.emit('changeHueBridges', this);
            this.GetFullState(null, i, this.FullState.bind(this));
          } else {
            this.bridges[i].message = 'Hue Bridgeのリンクボタンを押してから、上のペアリングボタンを押して下さい。';
            this.bridges[i].state = 0;            
            this.common.emit('changeHueBridges', this);
          }
        }
      }, 5000);
    });
  }

  RegistBridge(err, res, body) {
    if(err) {
      console.log(err);
      return;
    }
    if(body[0].error) {
      console.log(body[0].error.description);
      return;
    }
    if(!body[0].success) {
      console.log('RegistHueBridge error');
      return;
    }
    const bridgeNo = res.request.bridgeNo;
    const origin = res.request.origin;
    this.bridges[bridgeNo].user = body[0].success.username;
    this.bridges[bridgeNo].state = 2;
    this.common.emit('changeHueBridges', this);
    this.GetFullState(origin, bridgeNo, this.FullState.bind(this));
  }

  FullState(err, res, body) {

    if(err || (typeof(body) != 'object')) {
      console.log('hueAPI: FullState\n', err);
      return;
    }
    const bridgeNo = res.request.bridgeNo;
    for(const i in body.lights) {
      if(!this.bridges[bridgeNo].lights) this.bridges[bridgeNo].lights = {};
      if(body.lights[i] && body.lights[i].state && body.lights[i].state.on) {
        this.bridges[bridgeNo].lights[i] = body.lights[i];
      } else {
        if(!this.bridges[bridgeNo].lights[i]) this.bridges[bridgeNo].lights[i] = {};
        for(const j in body.lights[i]) {
          if(j == 'state') {
            if(!this.bridges[bridgeNo].lights[i][j]) this.bridges[bridgeNo].lights[i][j] = {};
            this.bridges[bridgeNo].lights[i][j].on = false;
            continue;
          }
          this.bridges[bridgeNo].lights[i][j] = body.lights[i][j];
        }
      }
    }
    this.bridges[bridgeNo].state = 1;
    this.bridges[bridgeNo].message = '';
    this.common.emit('changeHueBridges', this);
    for(const l in this.bridges[bridgeNo].lights) {
      const light = this.bridges[bridgeNo].lights[l];
      const d = {
        device: 'Hue_' + this.bridges[bridgeNo].id + '_' + l,
        deviceName: light.name,
        func: 'hue',
        funcName: 'Hue',
        type: 'onOff',
        value: light.state.on,
        valueName: light.state.on?'on':'off',
        state: light.state,
      }
      let f = false;
      for(const i in this.common.status) {
        const st = this.common.status[i];
        if(st.device == d.device) {
          this.common.status[i] = d;
          f = true;
          break;
        }
      }
      if(!f) this.common.status.push(d);
    }
    this.common.emit('statusNotify', this);
  }

  SendResponse(origin, status) {
    const msg = {
      type: 'response',
      data: [{
        device: origin.device,
        command: origin.command,
        origin: origin,
        status: status?'error':'ok',
      }],
    };
    this.common.emit('response', this, msg);
  }

  SetLight(origin, bridgeNo, light, state) {
    state.alert = 'none';
    for(const i in this.common.status) {
      const st = this.common.status[i];
      if(st.device == 'Hue_' + this.bridges[bridgeNo].id + '_' + light) {
        this.common.status[i].state = state;
        this.common.status[i].value = state.on;
        this.common.status[i].valueName = state.on?'on':'off';
        break;
      }
    }
    this.common.emit('statusNotify', this);

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.SetLightState(origin, bridgeNo, light, state, (err, res, _body) => {
      const origin = res.request.origin;
      this.SendResponse(origin, err);
      this.common.emit('changeHueBridges', this);
    });
  }

  BlinkLight(origin, bridgeNo, light) {
    let state = {
      ct: 370,
      bri: 254,
      sat: 254,
      alert: 'select'
    }
    this.SetLightState(origin, bridgeNo, light, state);
  }

  NormalLight(origin, bridgeNo, light) {
    let state = {
      ct: 370,
      bri: 254,
      on: true,
      alert: 'none'
    }
    this.SetLightState(origin, bridgeNo, light, state);
  }

  SearchLights(origin, bridgeNo, touchLink) {
    
    if((this.bridges[bridgeNo] == null) || this.bridges[bridgeNo].state != 1) return;
    this.bridges[bridgeNo].state = 2;
    this.bridges[bridgeNo].message = '新規ライトをサーチしています。数十秒かかります。';
    this.common.emit('changeHueBridges', this);

    this.SetConfig(origin, bridgeNo, { touchlink: touchLink }, (err) => {
      if(err) console.log('touchlink', err);
      this.SearchNewLights(origin, bridgeNo, null, (err, res) => {
        const bridgeNo = res.request.bridgeNo;
        const origin = res.request.origin;
        if(err) {
          console.log(err);
          this.bridges[bridgeNo].state = 1;
          this.bridges[bridgeNo].message = '';
          this.common.emit('changeHueBridges', this);
          return;
        }
        this.searchTimer = setTimeout((origin, bridgeNo) => {this.CheckNewLights(origin, bridgeNo);}, 5000, origin, bridgeNo);
      });
    });
  }

  CheckNewLights(origin, bridgeNo) {
  
    this.GetNewLights(origin, bridgeNo, (err, res, body) => {
      const bridgeNo = res.request.bridgeNo;
      const origin = res.request.origin;
      if(!err && (typeof(body) == 'object') && (body.lastscan == 'active')) {
        this.searchTimer = setTimeout((origin, bridgeNo) => {this.CheckNewLights(origin, bridgeNo);}, 1000, origin, bridgeNo);
        return;
      }
      
      if(!err && (typeof(body) == 'object') && ('lastscan' in body)) {
        this.GetFullState(origin, bridgeNo, this.FullState.bind(this));
        return;
      }
      console.log('GetNewLights Error');
      this.bridges[bridgeNo].state = 1;
      this.bridges[bridgeNo].message = '';
      this.common.emit('changeHueBridges', this);
    });
  }

  DeleteLight(origin, bridgeNo, light, callback) {
    this.Request(origin, bridgeNo, '/lights/' + light, 'delete', null, callback);
  }

  GetNewLights(origin, bridgeNo, callback) {
    this.Request(origin, bridgeNo, '/lights/new', 'get', null, callback);
  }

  SetConfig(origin, bridgeNo, body, callback) {
    this.Request(origin, bridgeNo, '/config', 'put', body, callback);
  }

  SearchNewLights(origin, bridgeNo, body, callback) {
    this.Request(origin, bridgeNo, '/lights', 'post', body, callback);
  }

  SetName(origin, bridgeNo, id, body, callback) {
    this.Request(origin, bridgeNo, '/lights/' + id, 'put', body, callback);
  }

  SetLightState(origin, bridgeNo, id, body, callback) {
    this.Request(origin, bridgeNo, '/lights/' + id + '/state', 'put', body, (err, res, body) => {
      if(err) {
        console.log('error API:setLightState',err);
      } else {
        this.GetFullState(origin, bridgeNo, this.FullState.bind(this));
      }
      if(callback) callback(err, res, body);
    });
  }

  Pairing(origin, bridgeNo, body, callback) {
    this.Request(origin, bridgeNo, '', 'post', body, callback);
  }

  GetFullState(origin, bridgeNo, callback) {
    this.Request(origin, bridgeNo, '', 'get', null, callback);
  }

  Request(origin, bridgeNo, path, method, body, callback) {
    if(!this.bridges[bridgeNo]) {
      console.log('error: Request');
      return;
    }

    let req = {
        url:'http://' + this.bridges[bridgeNo].ip + '/api/' + (this.bridges[bridgeNo].user||'') + path,
        method: method,
        json: true,
        body: body?body:{},
        bridgeNo: bridgeNo,
        origin: origin,
    };
    request(req, (err, req, body) => {
      if(callback) callback(err, req, body);
    });
  }
}

module.exports = HueAPI;
