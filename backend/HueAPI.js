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

    this._common = common;
    this._common.on('sendControllerCommand', (caller, msg) => {
      let device = '';
      if(this._common.aliasTable && msg.deviceName && (msg.deviceName in this._common.aliasTable)) {
        device = this._common.aliasTable[msg.deviceName].device;
      } else {
        device = msg.device || msg.deviceName;
      }
      if(!device.match(/^Hue_/)) return;

      const bridgeId = device.replace(/^Hue_/, '').replace(/_.*$/, '');
      const light = device.replace('Hue_' + bridgeId, '').replace(/^_/, '');
      let bridgeNo = -1;
      if(this._bridges) {
        for(let i in this._bridges) {
          if(this._bridges[i].id == bridgeId) bridgeNo = i;
        }
      }

      const args = msg.command.split(/[ \t]/);
      switch(args[0]) {
      case 'pairing':
        this._Pairing(msg, bridgeNo, {devicetype: "geckolink"}, this._RegistBridge.bind(this));
        break;
      case 'search':
        this._SearchLights(msg, bridgeNo);
        break;
      case 'flash':
        if(light && (light != '')) this._BlinkLight(msg, bridgeNo, light);
        break;
      case 'name':
        if(light && (light != '')) this._SetName(msg, bridgeNo, light, {name: args[1]});
        break;
      case 'ct':
        if(!args[1] || (args[1] < 2000) || args[1] > 6500) {
          console.log('ct illegal parameter ct:', args[1]);
          this._SendResponse(msg, true);
          return;
        }
        if(!args[2] || (args[2] < 0) || args[2] > 254) {
          console.log('ct illegal parameter bri:', args[2]);
          this._SendResponse(msg, true);
          return;
        }
        if(light && (light != '')) this._SetLight(msg, bridgeNo, light, {ct: parseInt(1000000 / args[1]), bri: parseInt(args[2])});
        break;
      case 'hue':
        if(!args[1] || (args[1] < 0) || args[1] > 65535) {
          console.log('hue illegal parameter hue:', args[1]);
          this._SendResponse(msg, true);
          return;
        }
        if(!args[2] || (args[2] < 0) || args[2] > 254) {
          console.log('hue illegal parameter sat:', args[2]);
          this._SendResponse(msg, true);
          return;
        }
        if(!args[3] || (args[3] < 0) || args[3] > 254) {
          console.log('hue illegal parameter bri:', args[3]);
          this._SendResponse(msg, true);
          return;
        }
        if(light && (light != '')) this._SetLight(msg, bridgeNo, light, {hue: parseInt(args[1]), sat: parseInt(args[2]), bri: parseInt(args[3])});
        break;
      case 'switch':
        let state = {
          on: this._bridges[bridgeNo].lights[light].state.on,
          ct: this._bridges[bridgeNo].lights[light].state.ct,
          hue: this._bridges[bridgeNo].lights[light].state.hue,
          sat: this._bridges[bridgeNo].lights[light].state.sat,
          bri: this._bridges[bridgeNo].lights[light].state.bri,
          alert: 'none',
          transitiontime: 0
        };
        if(state.bri == 1) state.bri = 254;
        if(args[1] == 'on') state.on = true;
        if(args[1] == 'off') state.on = false;
        if(args[1] == 'toggle') state.on = !state.on;

        if(light && (light != '')) this._SetLight(msg, bridgeNo, light, state);
        break;
      default:
        console.log('hue command error ', args[0]);
      }
    });
    this._common.on('changeHueBridges', (caller) => {
      if(caller == this) return;
      if(!this._common.hueBridges) this._common.hueBridges = [];
      this._bridges = this._common.hueBridges;
  /*
    hueBridges = [
      { id: deviceID, ip: ipaddr, lastIp: lastIp , message: msg, state: num(0:nolink/1:link/2:busy), user: user}
    ]
  */

      for(let bridge of this._bridges) {
        bridge.lastIp = bridge.ip;
        bridge.ip = null;
      }

      ssdp.on('DeviceFound', (info) => {
        if((info.server.search(/IpBridge/) >= 0) &&
           (info.st.search(/rootdevice/) >= 0)) {
          let ip = info.location.replace(/^.*http:\/\//,'').replace(/:.*$/,'');
          let id = info.usn.replace(/^.*-/,'').replace(/:.*$/,'').slice(-6);
          let no = -1;
          for(let i in this._bridges) {
            if(this._bridges[i].id == id) no = i;
          }
          if(no < 0) {
            this._bridges.push({id: id, ip: ip, state: 0});
            no = this._bridges.length - 1;
          } else {
            this._bridges[no].ip = ip;
          }
        }
      });
      ssdp.mSearch('ssdp:root');

      request.get({url:'https://www.meethue.com/api/nupnp', json:true}, (err, res, body) => {
        if(err) return;
        for(let device of body) {
          var id = device.id.slice(-6);
          var ip = device.internalipaddress;
          let no = -1;
          for(let i in this._bridges) {
            if(this._bridges[i].id == id) no = i;
          }
          if(no < 0) {
            this._bridges.push({id: id, ip: ip});
          } else {
            this._bridges[no].ip = ip;
          }
        }
      });
      
      setTimeout(() => {
        for(let i in this._bridges) {
          const bridge = this._bridges[i];
          if(!bridge.ip) bridge.ip = bridge.lastIp;
          if(bridge.user) {
            this._bridges[i].message = '';
            this._bridges[i].state = 2; 
            this._common.emit('changeHueBridges', this);
            this._GetFullState(null, i, this._FullState.bind(this));
          } else {
            this._bridges[i].message = 'Hue Bridgeのリンクボタンを押してから、上のペアリングボタンを押して下さい。';
            this._bridges[i].state = 0;            
            this._common.emit('changeHueBridges', this);
          }
        }
      }, 5000);
    });
  }

  _RegistBridge(err, res, body) {
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
    this._bridges[bridgeNo].user = body[0].success.username;
    this._bridges[bridgeNo].state = 2;
    this._common.emit('changeHueBridges', this);
    this._GetFullState(origin, bridgeNo, this._FullState.bind(this));
  }

  _FullState(err, res, body) {

    if(err || (typeof(body) != 'object')) {
      console.log('hueAPI: FullState\n', err);
      return;
    }
    const bridgeNo = res.request.bridgeNo;
    this._bridges[bridgeNo].lights = body.lights;
    this._bridges[bridgeNo].state = 1;
    this._bridges[bridgeNo].message = '';
    this._common.emit('changeHueBridges', this);
    for(let l in this._bridges[bridgeNo].lights) {
      const light = this._bridges[bridgeNo].lights[l];
      const d = {
        device: 'Hue_' + this._bridges[bridgeNo].id + '_' + l,
        deviceName: light.name,
        func: 'hue',
        funcName: 'Hue',
        type: 'onOff',
        value: light.state.on,
        valueName: light.state.on?'on':'off',
      }
      let f = false;
      for(let i in this._common.status) {
        const st = this._common.status[i];
        if(st.device == d.device) {
          this._common.status[i] = d;
          f = true;
          break;
        }
      }
      if(!f) this._common.status.push(d);
    }
    this._common.emit('statusNotify', this);
  }

  _SendResponse(origin, status) {
    const msg = {
      type: 'response',
      data: [{
        device: origin.device,
        command: origin.command,
        origin: origin,
        status: status?'error':'ok',
      }],
    };
    this._common.emit('response', this, msg);
  }

  _SetLight(origin, bridgeNo, light, state) {
    state.alert = 'none';
    this._SetLightState(origin, bridgeNo, light, state, (err, res, body) => {
      const origin = res.request.origin;
      this._SendResponse(origin, err);
    });
  }

  _BlinkLight(origin, bridgeNo, light) {
    let state = {
      ct: 370,
      bri: 254,
      sat: 254,
      alert: 'select'
    }
    this._SetLightState(origin, bridgeNo, light, state);
  }

  _NormalLight(origin, bridgeNo, light) {
    let state = {
      ct: 370,
      bri: 254,
      on: true,
      alert: 'none'
    }
    this._SetLightState(origin, bridgeNo, light, state);
  }

  _SearchLights(origin, bridgeNo) {
    
    if(this._bridges[bridgeNo].state != 1) return;
    this._bridges[bridgeNo].state = 2;
    this._bridges[bridgeNo].message = '新規ライトをサーチしています。数十秒かかります。';
    this._common.emit('changeHueBridges', this);

    this._SearchNewLights(origin, bridgeNo, null, (err, res, body) => {
      const bridgeNo = res.request.bridgeNo;
      const origin = res.request.origin;
      if(err) {
        console.log(err);
        this._bridges[bridgeNo].state = 1;
        this._bridges[bridgeNo].message = '';
        this._common.emit('changeHueBridges', this);
        return;
      }
      this._searchTimer = setTimeout((origin, bridgeNo) => {this._CheckNewLights(origin, bridgeNo);}, 5000, origin, bridgeNo);
    });
  }

  _CheckNewLights(origin, bridgeNo) {
  
    this._GetNewLights(origin, bridgeNo, (err, res, body) => {
      const bridgeNo = res.request.bridgeNo;
      const origin = res.request.origin;
      if(!err && (typeof(body) == 'object') && (body.lastscan == 'active')) {
        this._searchTimer = setTimeout((origin, bridgeNo) => {this._CheckNewLights(origin, bridgeNo);}, 1000, origin, bridgeNo);
        return;
      }
      
      if(!err && (typeof(body) == 'object') && ('lastscan' in body)) {
        this._GetFullState(origin, bridgeNo, this._FullState.bind(this));
        return;
      }
      console.log('GetNewLights Error');
      this._bridges[bridgeNo].state = 1;
      this._bridges[bridgeNo].message = '';
      this._common.emit('changeHueBridges', this);
    });
  }

  _GetNewLights(origin, bridgeNo, callback) {
    this._Request(origin, bridgeNo, '/lights/new', 'get', null, callback);
  }

  _SearchNewLights(origin, bridgeNo, body, callback) {
    this._Request(origin, bridgeNo, '/lights', 'post', body, callback);
  }

  _SetName(origin, bridgeNo, id, body, callback) {
    this._Request(origin, bridgeNo, '/lights/' + id, 'put', body, callback);
  }

  _SetLightState(origin, bridgeNo, id, body, callback) {
    this._Request(origin, bridgeNo, '/lights/' + id + '/state', 'put', body, (err, res, body) => {
      if(err) {
        console.log('error API:setLightState',err);
      } else {
        this._GetFullState(origin, bridgeNo, this._FullState.bind(this));
      }
      if(callback) callback(err, res, body);
    });
  }

  _Pairing(origin, bridgeNo, body, callback) {
    this._Request(origin, bridgeNo, '', 'post', body, callback);
  }

  _GetFullState(origin, bridgeNo, callback) {
    this._Request(origin, bridgeNo, '', 'get', null, callback);
  }

  _Request(origin, bridgeNo, path, method, body, callback) {
    if(!this._bridges[bridgeNo]) {
      console.log('error: _Request');
      return;
    }

    let req = {
        url:'http://' + this._bridges[bridgeNo].ip + '/api/' + (this._bridges[bridgeNo].user||'') + path,
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