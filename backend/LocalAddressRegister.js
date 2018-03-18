//
// LocalAddressRegister.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const request = require('request');
const interfaces = require('os').networkInterfaces();

class LocalAddressRegister {

  constructor(common) {
    this._common = common;
    if(!this._common.config.localIPRegistHost) return;
    
    this.host = this._common.config.localIPRegistHost;
    this.port = this._common.config.localIPRegistPort;
    this.localAddr = null;

    for(const device in interfaces) {
      if(device.search(/^lo/) >= 0) continue;
      for(const details of interfaces[device]) {
       if(details.internal) continue;
        if(details.family == 'IPv4') {
          this.localAddr = details.address;
          this.macAddr = details.mac;
          break;
        }
      }
      if(this.localAddr) break;
    }
    if(!this.localAddr) {
      console.log('LocalAddressRegister: network interface error');
      return;
    }
    
    this._common.on('requestAuthkey', (caller, msg) => {
      request.post(
        {
          url: this.host + (this.port?':'+this.port:'') + '/requestAuthkey',
          form: {
            reqData: msg.data[0].result,
            macAddr: this.macAddr,
          },
          json: true,
        }, 
        (err, res, body) => {
          if(err) {
            console.log('error:', err);
            msg.data[0].status = 'error';
            msg.data[0].message = 'server connection error';
            msg.data[0].result = null;
          } else if(res.statusCode != 200){
            console.log('error: '+ res.statusCode);
            msg.data[0].status = 'error';
            msg.data[0].message = 'server error';
            msg.data[0].result = null;
          } else if(!body.resData) {
            console.log('error: device authentication error');
            msg.data[0].status = 'error';
            msg.data[0].message = 'authentication error';
            msg.data[0].result = null;
          } else {
            this._common.emit('sendControllerCommand', this, {
              type: 'command',
              device: 'server',
              command: 'moduleauth',
              auth: body.resData,
            });
            msg.data[0].status = null;
            msg.data[0].result = null;
          }
          this._common.emit('response', this, msg);
        }
      );     
    });

    console.log('LocalAddressRegister:', this.localAddr, this.macAddr);
    this._IntervalEvent();
  }

  _IntervalEvent() {

    request.post(
      {
        url: this.host + (this.port?':'+this.port:'') + '/localAddrRegist',
        form: {
          localAddr: this.localAddr,
          macAddr: this.macAddr,
        },
        json: true,
      }, 
      /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
      (err, res, _body) => {
        if(err) {
          console.log('error:', err);
        } else if(res.statusCode != 200){
          console.log('error: '+ res.statusCode);
        }
      }
    );     
    setTimeout(this._IntervalEvent.bind(this), 5 * 60 * 1000);
  }
}

module.exports = LocalAddressRegister;
