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

    this._common = common;
    this._connectState = -1;
    this._connectServer = false;
    this._connectMessage = true;
    this._intervalId = null;
    this._wssClient = null;
    this._lastSendTime = new Date();

    //ApplicationServer
    this._common.on('changeUITable', this._SendClientUi.bind(this));

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.on('statusNotify', (_caller) => {
      this._SendData(this, {type:'interval', data:this._common.status});
    });

    this._common.on('changeStatus', this._SendData.bind(this));

    this._common.on('irReceive', this._SendData.bind(this));

    this._common.on('response', this._SendData.bind(this));
    
    this._common.on('message', this._SendData.bind(this));
    
    this._common.on('deviceInfo', this._SendData.bind(this));

    this._common.on('sendMail', this._SendData.bind(this));
    
    this._common.on('changeSystemConfig', (_caller) => {
      if(this._connectState > 0) this._wssClient.terminate();
      if(this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      this._connectState = 0;

      if(!this._common.systemConfig.serverKeys || (this._common.systemConfig.remote != 'on')) {
        this._connectServer = false;
        this._serverHost = 'localhost';
        this._serverPort = this._common.config.localApplicationPort;
        this._scheme = 'ws://';
        this._options = null;
        this._SetAuthorizedKeys();
        this._IntervalConnectWS();
        return;
      }
      
      this._connectServer = true;
      this._options = {
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
      if(this._common.systemConfig.proxy && this._common.systemConfig.proxy.match(/^.+\..+:[0-9]+$/) && this._common.systemConfig.proxy.match(/^.+\..+:[0-9]+$/).length) {
        this._options.proxy = {
          host: this._common.systemConfig.proxy.replace(/^.*\//, '').replace(/:.*$/,''),
          port: this._common.systemConfig.proxy.replace(/^.*:/, ''),
        }
        this._options.agent = tunnel.httpsOverHttp(this._options);
      }
      this._scheme = 'wss://';
      
      const buf = Buffer.from(this._common.systemConfig.serverKeys);
      zlib.gunzip(buf, (err, data) => {
        let serverKeys = null;
        try {
          serverKeys = JSON.parse(data.toString());
        } catch(e) {
          console.log('ServerConnection : server keys parse error');
          console.log(e);
          return;
        }
        this._serverHost = serverKeys.serverHost;
        this._serverPort = serverKeys.serverPort;
        this._serverAllowClient = serverKeys.allowClient;
        if(serverKeys.authorizedKeysBody) this._authorizedKeys = Buffer.from(serverKeys.authorizedKeysBody);
        if(serverKeys.caFileBody) this._options.ca = Buffer.from(serverKeys.caFileBody);
        if(serverKeys.certFileBody) this._options.cert = Buffer.from(serverKeys.certFileBody);
        if(serverKeys.keyFileBody) this._options.key = Buffer.from(serverKeys.keyFileBody);
        this._SetAuthorizedKeys();
        this._IntervalConnectWS();
      });
    });
  }
  
  _SetAuthorizedKeys() {
    
    if(process.getuid() == 0) return;
    if(!this._common.systemConfig.sshKeys && !this._authorizedKeys) return;

    try {
      fs.mkdirSync(this._common.home + '/.ssh', 0o700);
    } catch(e) {/* empty */}
    try {
      fs.unlinkSync(this._common.home + '/.ssh/authorized_keys');
    } catch(e) {/* empty */}
    
    if(this._authorizedKeys) {
      try {
        fs.appendFileSync(this._common.home + '/.ssh/authorized_keys', this._authorizedKeys, {mode:0o600, encoding:null});
      } catch(e) {console.log(e)}
    }

    if(this._common.systemConfig.sshKeys) {
      try {
        fs.appendFileSync(this._common.home + '/.ssh/authorized_keys', this._common.systemConfig.sshKeys, {mode:0o600, encoding:null});
      } catch(e) {console.log(e)}
    }
  }
  
  _IntervalConnectWS() {
    if(this._connectState == 0) {
      this._wssClient = new ws(this._scheme + this._serverHost + ':' + this._serverPort, null, this._options);

      this._wssClient.on('open', () => {
        console.log('ServerConnection : connected ', this._scheme + this._serverHost + ':' + this._serverPort);
        this._wssRetry = 0;
        this._connectMessage = true;
        this._WSSConnect();
      });

      this._wssClient.on('message', (data) => {
        if(this._connectState == 1) {
          const strs = data.split('\0');
          for(let str of strs) {
            if(str.length) {
              let jsonStr = null;
              try{
                jsonStr = JSON.parse(str);
              } catch(e) {
                console.log('ServerConnection : json parse error : ', str);
              }
              this._Receive(jsonStr);
            }
          }
        }
      });

      this._wssClient.on('close', () => {
        this._connectMessage = false;
        if(this._connectState > 0) {
          console.log('ServerConnection : disconnect ' + this._serverHost);
          this._connectState = 0;
        }
      });

      this._wssClient.on('error', (e) => {
        if(this._connectState > 0) this._connectState = 0;
        this._wssClient.terminate();
        if((e.syscall == 'getaddrinfo') && (e.errno == 'ENOTFOUND')) {
          if(this._connectMessage) console.log('ApplicationServer connect error %s:%d', e.host, e.port);
          this._connectMessage = false;
          return;
        }
        if((e.syscall == 'connect') && (e.errno == 'ECONNREFUSED')) {
          if(this._connectMessage) console.log('ApplicationServer connect error %s:%d', e.host, e.port);
          this._connectMessage = false;
          return;
        }
        console.log('----');
        console.log('[ error ]');
        console.log(Date());
        console.log(e.stack);
        console.log('----');
      });

      this._wssClient.on('unexpected-response', () => {
        console.log('ServerConnection : unexpected-response ' + this._serverHost);
        if(this._connectState > 0) this._connectState = 0;
        this._wssClient.terminate();
      });

    } else {
      const now = new Date();
      if(now - this._lastSendTime >= 30 * 1000) {
        this._SendData(this, {type:'interval', data:this._common.status});
      }
    }
    if(this._intervalId == null) {
      this._intervalId = setInterval(() => { this._IntervalConnectWS(); }, 5 * 1000);
    }
  }

  _WSSConnect() {
    if(this._wssClient.readyState == 0) {
      this._wssRetry++;
      console.log('ServerConnection : ---152 _WSSConnect no ready', this._wssRetry);  // DEBUG
      if(this._wssRetry > 3) return;
      return setTimeout(this._WSSConnect.bind(this), 300);
    }

    this._connectState = 1;
    this._connectMessage = true;
    console.log('ServerConnection : connect ' + this._serverHost); // DEBUG
    this._SendClientUi();
    this._SendData(this, {type:'interval', data:this._common.status});
    this._SendData(this, {type:'deviceInfo', data:this._common.deviceInfo});
    if(this._serverAllowClient) this._SendData(this, {type:'allowClient', data:this._serverAllowClient});
  }

  _SendClientUi() {
    const system = {
      mailto: this._common.systemConfig.mailto,
    };
    if(!this._common.systemConfig.radius ||
       (this._common.systemConfig.radius == '')) {
      this._common.systemConfig.radius = '5000';
    }
    if(this._common.systemConfig.latitude &&
       (this._common.systemConfig.latitude != '') &&
       this._common.systemConfig.longitude &&
       (this._common.systemConfig.longitude != '')) {
      system.amesh = {
        latitude: 'N' + this._common.systemConfig.latitude,
        longitude: 'E' + this._common.systemConfig.longitude,
        radius: this._common.systemConfig.radius + 'm',
      };
    }
    this._SendData(this, {type:'client_ui', data:{ RoomList:this._common.uiTable.RoomList, ItemList:this._common.uiTable.ItemList, TableList:this._common.remocon.remoconGroup, System:system}});
  }

  _Receive(msg) {
    if(msg.type == 'command') {
      let cmd = msg.command;
      if(msg.func) cmd = msg.func + ' ' + msg.mode;
      this._common.emit('sendControllerCommand', this, {deviceName: msg.deviceName, command: cmd});
    } else if(msg.type == 'rainInfo') {
      this._common.internalStatus.rainInfo = msg.data;
      this._common.emit('changeInternalStatus', this);
    }
  }

  _SendData(caller, msg) {
    if(this._connectState != 1) return;
    if(this._wssClient.readyState == 0) return;
    if(this._wssClient._closeReceived)  console.log('ServerConnection : closeReceived'); // DEBUG
    if(this._wssClient._socket) { // DEBUG
      if(this._wssClient._socket.connecting) console.log('ServerConnection : connecting = false'); // DEBUG
    } // DEBUG
    try {
      this._wssClient.send(JSON.stringify(msg));
      this._lastSendTime = new Date();
    } catch(e) {
      console.log('ServerConnection : wssClient send error'); // DEBUG
      console.dir(this._wssClient); // DEBUG
    }
  }
}

module.exports = ServerConnection;
