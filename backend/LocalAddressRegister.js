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
    this.common = common;
    if(!this.common.config.registryHost) return;
    
    this.registryHost = this.common.config.registryHost;
    this.localIPRegistPort = this.common.config.localIPRegistPort;
    this.applicationPort = this.common.config.applicationPort;
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

    this.common.on('requestAuthkey', (caller, msg) => {
      request.post(
        {
          url: this.registryHost + (this.applicationPort ? ':' + this.applicationPort : '' ) + '/requestAuthkey',
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
          } else if(msg.data[0].command.match(/^config [^ ]* n /)) {
            msg.data[0].status = null;
            msg.data[0].result = null;
            this.common.systemConfig.freeKeys = body.resData.key;
            this.common.systemConfig.changeAuthKey = true;
            this.common.systemConfig.accessKey = body.resData.accessKey;
            this.common.emit('changeSystemConfig', this);
          } else {
            this.common.emit('sendControllerCommand', this, {
              type: 'command',
              device: 'server',
              command: 'moduleauth',
              auth: body.resData,
            });
            msg.data[0].status = null;
            msg.data[0].result = null;
          }
          this.common.emit('response', this, msg);
        }
      );     
    });

    console.log('LocalAddressRegister:', this.localAddr, this.macAddr);
    this.IntervalEvent();
  }

  IntervalEvent() {

    request.post(
      {
        url: this.registryHost + ( this.localIPRegistPort ? ':' + this.localIPRegistPort : '' ) + '/localAddrRegist',
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
    setTimeout(this.IntervalEvent.bind(this), 5 * 60 * 1000);
  }
}

module.exports = LocalAddressRegister;
