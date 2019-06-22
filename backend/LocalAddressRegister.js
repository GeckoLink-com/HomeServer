//
// LocalAddressRegister.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const fs = require('fs');
const request = require('request');
const {networkInterfaces} = require('os');
const {execSync, exec} = require('child_process');

class LocalAddressRegister {

  constructor(common) {
    this.common = common;

    if(process.platform.indexOf('linux') === 0) {
      this.macAddr = fs.readFileSync('/sys/class/net/eth0/address').toString().trim();
    } else if(process.platform.indexOf('darwin') === 0) {
      this.macAddr = execSync('/sbin/ifconfig en0', { encoding: 'utf8' }).match(/ether(.+)/)[1].trim();
    } else {
      this.macAddr = 'unknown';
    }
    this.common.macAddr = this.macAddr;

    if(!this.common.config.registryHost) return;
    this.registryHost = this.common.config.registryHost;
    this.localIPRegistPort = this.common.config.localIPRegistPort;
    this.applicationPort = this.common.config.applicationPort;

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
            console.log('LocalAddressRegister: server connection error : ', err);
            msg.data[0].status = 'error';
            msg.data[0].message = 'server connection error';
            msg.data[0].result = null;
          } else if(res.statusCode != 200){
            console.log('LocalAddressRegister: server error: '+ res.statusCode);
            msg.data[0].status = 'error';
            msg.data[0].message = 'server error';
            msg.data[0].result = null;
          } else if(!body.resData) {
            console.log('LocalAddressRegister: authentication error: device authentication error');
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
    this.common.on('buttonTrigger', this.IntervalEvent.bind(this));
    this.Timeout = setTimeout(this.IntervalEvent.bind(this), 5 * 1000);
  }

  IntervalEvent() {

    this.localAddr = null;
    const interfaces = networkInterfaces();
    for(const device in interfaces) {
      if(device.search(/^lo/) >= 0) continue;
      if(device.search(/^pan/) >= 0) continue;
      if(device.search(/^bnep/) >= 0) continue;
      for(const details of interfaces[device]) {
       if(details.internal) continue;
        if(details.family === 'IPv4') {
          this.localAddr = details.address;
          break;
        }
        if((details.family === 'IPv6') && (details.address.substr(0, 5) !== 'fe80:')) {
          this.localAddr = `[${details.address}]`;
          break;
        }
      }
      if(this.localAddr) break;
    }
    if(!this.bluetoothNAP && this.common.wifiEnable && !this.localAddr) {
      this.bluetoothNAP = true;
      exec("/usr/bin/bt-adapter --set Discoverable 1", (err, stdout, stderr) => {
        if(err) console.log('bt-adapter : ', err);
        console.log('bt-adapter : ', stdout, stderr);
      });
    } else if(((this.bluetoothNAP === undefined) || this.bluetoothNAP) && this.localAddr) {
      this.bluetoothNAP = false;
      exec("/usr/bin/bt-adapter --set Discoverable 0", (err, stdout, stderr) => {
        if(err) console.log('bt-adapter : ', err);
        console.log('bt-adapter : ', stdout, stderr);
      });
    }
    
    if(!this.localAddr) {
      console.log('LocalAddressRegister: network interface error');
      if(this.Timeout) clearTimeout(this.Timeout);
      this.Timeout = setTimeout(this.IntervalEvent.bind(this), 30 * 1000);
      return;
    }

    console.log('LocalAddressRegister:', this.localAddr, this.macAddr);
    this.common.localAddr = this.localAddr;
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
          console.log('LocalAddressRegister: interval error:', err);
          if(this.Timeout) clearTimeout(this.Timeout);
          this.Timeout = setTimeout(this.IntervalEvent.bind(this), 30 * 1000);
          return;
        } else if(res.statusCode != 200){
          console.log('LocalAddressRegister: status error: '+ res.statusCode);
        }
      }
    );     
    if(this.Timeout) clearTimeout(this.Timeout);
    this.Timeout = setTimeout(this.IntervalEvent.bind(this), 5 * 60 * 1000);
  }
}

module.exports = LocalAddressRegister;
