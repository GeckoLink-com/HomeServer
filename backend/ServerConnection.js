//
// ServerConnection.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const ws = require('ws');
const tunnel = require('tunnel-agent');
const zlib = require('zlib');
const fs = require('fs');

class ServerConnection {

  constructor(common) {

    this.common = common;
    this.connectState = -1;
    this.connectMessage = true;
    this.intervalId = null;
    this.wssClient = null;
    this.lastSendTime = new Date();

    //ApplicationServer
    this.common.on('changeUITable', this.SendClientUi.bind(this));

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.common.on('statusNotify', (_caller) => {
      this.SendData(this, {type:'interval', data:this.common.status});
    });

    this.common.on('changeStatus', this.SendData.bind(this));

    this.common.on('irReceive', this.SendData.bind(this));

    this.common.on('response', (caller, msg) => {
      const rejectCommand = [ 'i2cr', 'i2cw', 'motor', 'config', 'moduleauth', 'update', 'xbeekey', 'rmdev', 'reboot', 'shutdown', 'sysled', 'avrboot', 'avrread', 'at' ];
      if(msg.data[0] && msg.data[0].command &&
        rejectCommand.indexOf(msg.data[0].command.split(' ')[0]) >= 0) return;
      this.SendData(caller, msg);
    });

    this.common.on('message', this.SendData.bind(this));
    
    this.common.on('deviceInfo', this.SendData.bind(this));

    this.common.on('sendMail', this.SendData.bind(this));

    this.common.on('authConfirm', this.SendData.bind(this));

    this.common.on('googleSmartHomeReportState', this.SendData.bind(this));

    this.common.on('changeSystemConfig', (_caller) => {
      if(this.connectState > 0) this.wssClient.terminate();
      this.connectState = -1;
      if(this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      if(!this.common.systemConfig.serverKeys && !this.common.systemConfig.freeKeys) {
        this.SetAuthorizedKeys();
        return;
      }

      this.options = {
        agent: false,
        ca: null,
        cert : null,
        key : null,
        ciphers: 'ALL:!EXP:!ADH:!LOW:!SSLv2:!SSLv3:!DES:!3DES:!RC4',
        honorCipherOrder: true,
        secureProtocol: 'TLSv1_2_method',
        requestCert: true,
        rejectUnauthorized: true
      };
      if(this.common.systemConfig.proxy && this.common.systemConfig.proxy.match(/^.+\..+:[0-9]+$/) && this.common.systemConfig.proxy.match(/^.+\..+:[0-9]+$/).length) {
        this.options.proxy = {
          host: this.common.systemConfig.proxy.replace(/^.*\//, '').replace(/:.*$/,''),
          port: this.common.systemConfig.proxy.replace(/^.*:/, ''),
        }
        this.options.agent = tunnel.httpsOverHttp(this.options);
      }
      this.scheme = 'wss://';
      
      const buf = Buffer.from(this.common.systemConfig.serverKeys || this.common.systemConfig.freeKeys);
      zlib.gunzip(buf, (err, data) => {
        let serverKeys = null;
        try {
          serverKeys = JSON.parse(data.toString());
        } catch(e) {
          console.log('ServerConnection : server keys parse error');
          console.log(e);
          return;
        }
        this.serverHost = serverKeys.serverHost;
        this.serverPort = serverKeys.serverPort;
        this.serverAllowClient = serverKeys.allowClient || [];

        if(serverKeys.authorizedKeysBody) this.authorizedKeys = Buffer.from(serverKeys.authorizedKeysBody);
        if(serverKeys.caFileBody) this.options.ca = Buffer.from(serverKeys.caFileBody);
        if(serverKeys.certFileBody) this.options.cert = Buffer.from(serverKeys.certFileBody);
        if(serverKeys.keyFileBody) this.options.key = Buffer.from(serverKeys.keyFileBody);

        if(this.options.cert.toString().match(/Subject:.*OU=([^ ,]*)/)[1] !== 'free_account') {
          if(this.common.systemConfig.remote) this.connectState = 0;
        }
        if(this.common.systemConfig.account.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
          if(this.common.systemConfig.remote || (this.common.systemConfig.requestRemoteAccessState > 0)) {
            this.connectState = 0;
          }
        }
        this.SetAuthorizedKeys();
        this.IntervalConnectWS();
      });
    });
  }
  
  SetAuthorizedKeys() {
    
    if(process.getuid() == 0) return;
    if(!this.common.systemConfig.changeAuthKey) return;
    if(!this.common.systemConfig.sshKeys && !this.authorizedKeys) return;

    try {
      fs.mkdirSync(this.common.home + '/.ssh', 0o700);
    } catch(e) {/* empty */}
    try {
      fs.unlinkSync(this.common.home + '/.ssh/authorized_keys');
    } catch(e) {/* empty */}
    
    if(this.authorizedKeys) {
      try {
        fs.appendFileSync(this.common.home + '/.ssh/authorized_keys', this.authorizedKeys, {mode:0o600, encoding:null});
      } catch(e) {console.log(e)}
    }

    if(this.common.systemConfig.sshKeys) {
      try {
        fs.appendFileSync(this.common.home + '/.ssh/authorized_keys', this.common.systemConfig.sshKeys, {mode:0o600, encoding:null});
      } catch(e) {console.log(e)}
    }
    this.common.systemConfig.changeAuthKey = false;
  }
  
  IntervalConnectWS() {
    if(this.connectState < 0) return;

    if(this.connectState == 0) {
      const account = Buffer.from(this.common.systemConfig.account).toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
      this.wssClient = new ws(this.scheme + this.serverHost + ':' + this.serverPort + '/connect/' + account, null, this.options);

      this.wssClient.on('open', () => {
        console.log('ServerConnection : connected ', this.scheme + this.serverHost + ':' + this.serverPort);
        this.connectMessage = true;
        this.WSSConnect();
      });

      this.wssClient.on('message', (data) => {
        if(this.connectState == 1) {
          const strs = data.split('\0');
          for(const str of strs) {
            if(str.length) {
              let jsonStr = null;
              try{
                jsonStr = JSON.parse(str);
              } catch(e) {
                console.log('ServerConnection : json parse error : ', str);
              }
              this.Receive(jsonStr);
            }
          }
        }
      });

      this.wssClient.on('close', () => {
        this.connectMessage = false;
        if(this.connectState > 0) {
          console.log('ServerConnection : disconnect ' + this.serverHost);
          this.connectState = 0;
        }
      });

      this.wssClient.on('error', (e) => {
        this.connectState = 0;
        this.wssClient.terminate();
        if((e.syscall == 'getaddrinfo') && (e.errno == 'ENOTFOUND')) {
          if(this.connectMessage) console.log('ApplicationServer connect error %s:%d', e.host, e.port);
          this.connectMessage = false;
          return;
        }
        if((e.syscall == 'connect') && (e.errno == 'ECONNREFUSED')) {
          if(this.connectMessage) console.log('ApplicationServer connect error %s:%d', e.host, e.port);
          this.connectMessage = false;
          return;
        }
        console.log('----');
        console.log('[ error ]');
        console.log(Date());
        console.log(e.stack);
        console.log('----');
      });

      this.wssClient.on('unexpected-response', () => {
        console.log('ServerConnection : unexpected-response ' + this.serverHost);
        this.connectState = 0;
        this.wssClient.terminate();
      });

    } else {
      const now = new Date();
      if(now - this.lastSendTime >= 30 * 1000) {
        this.SendData(this, {type:'interval', data:this.common.status});
      }
    }
    if(this.intervalId == null) {
      this.intervalId = setInterval(() => { this.IntervalConnectWS(); }, 5 * 1000);
    }
  }

  WSSConnect() {

    if(!this.wssClient) return;
    if(this.wssClient.readyState == 0) {
      this.connectState = 0;
      return this.wssClient.terminate();
    }
    if(this.connectState == 1) return;

    this.connectState = 1;
    this.connectMessage = true;
    this.wssSendRetry = 0;
    console.log('ServerConnection : connect ' + this.serverHost);
    if(this.common.systemConfig.accessKey) this.SendData(this, {type:'accessKey', data:this.common.systemConfig.accessKey});
    this.SendClientUi();
    this.SendData(this, {type:'interval', data:this.common.status});
    this.SendData(this, {type:'deviceInfo', data:this.common.deviceInfo});
    if(this.serverAllowClient) this.SendData(this, {type:'allowClient', data:this.serverAllowClient});
  }

  SendClientUi() {
    const system = {
      proxyId: this.common.proxyId,
      mailto: this.common.systemConfig.mailto,
    };
    if(!this.common.systemConfig.radius ||
       (this.common.systemConfig.radius == '')) {
      this.common.systemConfig.radius = '5000';
    }
    if(this.common.systemConfig.latitude &&
       (this.common.systemConfig.latitude != '') &&
       this.common.systemConfig.longitude &&
       (this.common.systemConfig.longitude != '')) {
      system.amesh = {
        latitude: 'N' + this.common.systemConfig.latitude,
        longitude: 'E' + this.common.systemConfig.longitude,
        radius: this.common.systemConfig.radius + 'm',
      };
    }
    this.SendData(this, {type:'client_ui', data:{ RoomList:this.common.uiTable.RoomList, ItemList:this.common.uiTable.ItemList, TableList:this.common.remocon.remoconGroup, System:system}});
  }

  Receive(msg) {
    switch(msg.type) {
    case 'error':
      console.log('error : ', msg.error);
      if((msg.error === 'invalid access') && this.common.systemConfig.remote) {
        this.common.systemConfig.remote = false;
        this.common.emit('changeSystemConfig', this);
      }
      break;
    case 'command':
      if(!this.common.systemConfig.remote) return;
      this.common.emit('sendControllerCommand', this, msg);
      break;
    case 'googleSmarthomeSync':
      if(!this.common.systemConfig.remote) return;
      this.common.emit('googleSmarthomeSync', this, msg);
      break;
    case 'googleSmarthomeQuery':
      if(!this.common.systemConfig.remote) return;
      this.common.emit('googleSmarthomeQuery', this, msg);
      break;
    case 'googleSmarthomeExecute':
      if(!this.common.systemConfig.remote) return;
      this.common.emit('googleSmarthomeExecute', this, msg);
      break;
    case 'rainInfo':
      if(!this.common.systemConfig.remote) return;
      if(!this.common.status['server:rainInfo']) {
        this.common.status['server:rainInfo'] = {
          device: 'server',
          deviceName: 'server',
          func: 'rainInfo',
          funcName: this.common.alias[0].rainInfo ? this.common.alias[0].rainInfo.name : 'rainInfo',
          type: 'rain',
        };
      }
      this.common.status['server:rainInfo'].value = msg.data;
      this.common.status['server:rainInfo'].valueName = msg.data;
      break;
    case 'accountValid':
      this.common.systemConfig.remote = true;
      this.common.systemConfig.requestRemoteAccessState = 0;
      this.common.emit('changeSystemConfig', this);
      break;
    case 'requestAuth':
      this.common.emit('requestAuth', this);
      break;
    case 'proxy':
      console.log('proxy : ', msg);
      break;
    }
  }

  SendData(caller, msg) {
    if(this.connectState != 1) return;
    if(!this.wssClient) return;
    if(this.wssClient.readyState == 0) return;
    if(this.wssClient._closeReceived) console.log('ServerConnection : closeReceived');
    if(!this.common.systemConfig.remote && (msg.type !== 'accessKey')) {
      console.log('ServerConnection : remote off');
      return;
    }
    try {
      this.wssClient.send(JSON.stringify(msg));
      this.lastSendTime = new Date();
      this.wssSendRetry = 0;
    } catch(e) {
      console.log('ServerConnection : wssClient send error');
      console.dir(this.wssClient); // DEBUG
      this.wssSendRetry++;
      if(this.wssSendRetry > 3) {
        this.connectState = 0;
        this.wssClient.terminate();
      }
    }
  }
}

module.exports = ServerConnection;
