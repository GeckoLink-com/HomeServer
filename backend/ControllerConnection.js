//
// ControllerConnection.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const net = require('net');

class ControllerConnection {

  constructor(common) {
  
    this._common = common;

    this._connectState = 0;
    this._client = null;
    this._connectMessage = true;
    this._controllerHost = this._common.config.controllerHost;
    this._controllerPort = this._common.config.controllerPort;
    this._intervalId = null;
    this._lastStr = '';
    
    this._common.on('sendControllerCommand', this._ExecCommand.bind(this));
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this._common.on('changeSystemConfig', (_caller) => {
      if(!this._common.systemConfig) return;
      this._IntervalConnect();
    });
  }
  
  _IntervalConnect() {
    if(this._connectState == 0) {
      this._client = net.connect(this._controllerPort, this._controllerHost);

      this._client.on('connect', () => {
        this._connectState = 1;
        this._connectMessage = true;
        console.log('connect controller : ', this._controllerHost);
        this._client.setEncoding('utf8');
      });

      this._client.on('data', (data) => {
        if(this._connectState == 1) {
          const strs = (this._lastStr + data).split('\0');
          for(let i in strs) {
            this._lastStr = '';
            if(strs[i].length) {
              let msg = null;
              try {
                msg = JSON.parse(strs[i]);
              } catch(e) {
                this._lastStr = strs[i];
                if(i < strs.length - 1) {
                  console.log('ControllerConnections: json parse error : ', strs);
                  console.log(data.length);
                }
              }
              if(msg) {
                this._StatusAlias(msg.data);
                this._Receive(msg);
              }
            }
          }
        }
      });

      this._client.on('end', () => {
        console.log('disconnect controller : ', this._controllerHost);
        this._connectMessage = false;
        this._connectState = 0;
      });

      this._client.on('error', (e) => {
        this._connectState = 0;
        this._client.destroy();
        if((e.syscall == 'getaddrinfo') && (e.errno == 'ENOTFOUND')) {
          if(this._connectMessage) console.log('ControlServer address error %s:%d', e.host, e.port);
          this._connectMessage = false;
          return;
        }
        if((e.syscall == 'connect') && (e.errno == 'ECONNREFUSED')) {
          if(this._connectMessage) console.log('ControlServer connect error %s:%d', e.address, e.port);
          this._connectMessage = false;
          return;
        }

        console.log('----');
        console.log('[ error ]');
        console.log(Date());
        console.log(e.stack);
        console.log('----');
      });
    }
    if(this._intervalId == null) {
      this._intervalId = setInterval(() => { this._IntervalConnect(); }, 5 * 1000);
    }
  }
  
  _ExecCommand(caller, msg) {
    let device = 0;
    msg.type = 'command';
    if(!Array.isArray(msg.command)) msg.command = msg.command.replace("'", '');
    this._common.ControllerLog(msg);
    if(msg.deviceName != 'server') {
      if(this._common.aliasTable && msg.deviceName && (msg.deviceName in this._common.aliasTable)) {
        device = this._common.aliasTable[msg.deviceName].device;
      } else {
        device = msg.device || msg.deviceName;
      }
      if(device.match(/^Hue_/)) return;
    }
    let commands = msg.command;    
    if(!Array.isArray(commands)) commands = [commands];
    for(let command of commands) {
      if(!command) continue;
      let func = command.replace(/[ \t].*$/, '');
      let param = command.replace(func, '').replace(/^[ \t]*/, '');
      if(func in this._common.aliasTable) {
        device = this._common.aliasTable[func].device;
        func = this._common.aliasTable[func].func;
      }
      if((func != 'name') && (device != 0) && (device in this._common.alias) &&
         (func in this._common.alias[device]) &&
         ('valueLabel' in this._common.alias[device][func])) {
        for(let i in this._common.alias[device][func].valueLabel) {
          if(param == this._common.alias[device][func].valueLabel[i]) {
            param = i;
            break;
          }
        }
      }
      if(!this._common.internalStatus.lastCommand) this._common.internalStatus.lastCommand = {};
      if(!this._common.internalStatus.lastCommand[msg.deviceName]) this._common.internalStatus.lastCommand[msg.deviceName] = {};
      if(func.indexOf('vsw') >= 0) {
        if(!('virtualSW' in this._common.internalStatus)) this._common.internalStatus.virtualSW = {};
        this._common.internalStatus.virtualSW[func] = param;
        this._common.emit('changeInternalStatus', this);
        this._common.internalStatus.lastCommand[msg.deviceName][func] = param;
      } else {
        let cmd = (func + ' ' + param).replace(/[ \t]*$/, '');
        let f = this._SendRemoconCommand(msg, device, func);
        if(f) {
          let type = null;
          const prefix = func.replace(/_[^_]*$/, '');
          if(this._common.remocon && this._common.remocon.remoconGroup && this._common.remocon.remoconGroup[prefix]) {
            type = this._common.remocon.remoconGroup[prefix].type;
          }
          this._common.internalStatus.lastCommand[msg.deviceName] = {
            remocon: func,
            type: type,
          };
          this._common.emit('changeInternalStatus', this);
          return;
        }
        if(this._common.remocon && this._common.remocon.remoconMacro && (func in this._common.remocon.remoconMacro)) {
          this._SendRemoconMacro(msg, device, this._common.remocon.remoconMacro[func].macro, 0);
          this._common.internalStatus.lastCommand[msg.deviceName][func.replace(/_[^_]*$/,'')] = func.replace(/^.*_/,'');
          return;
        }
        this._SendData({type:'command', device: device, command: cmd, origin: msg, auth: msg.auth});
        this._common.internalStatus.lastCommand[msg.deviceName][func] = param;
      }
    }
  }

  _SendRemoconMacro(origin, device, macro, p) {
    if(p >= macro.length) {
      this._common.emit('response', this, {
        type: 'response',
        data: [{
          type: 'command',
          origin: origin,
          device: device,
          deviceName: origin.deviceName,
          command: origin.command,
          status: 'ok',
        }],
      });
      return;
    }
    if(macro[p].wait) {
      setTimeout(this._SendRemoconMacro.bind(this), macro[p].wait, origin, device, macro, p+1);
    } else {
      if(macro[p].label && (macro[p].label != '')) {
        origin.macro = true;
        this._SendRemoconCommand(origin, device, macro[p].label);
      } else {
        let cmd = 'ir 01';
        const code = macro[p].code;
        for(let i = 0; i < code.length; i++) {
          cmd += ' ' + ('0' + code[i].toString(16)).slice(-2);
        }
        this._SendData({type:'command', device: device, command: cmd, origin: origin});
      }
      this._SendRemoconMacro(origin, device, macro, p+1);
    }
  }

  _SendRemoconCommand(origin, device, name) {
    if(!this._common.remocon) return false;
    if(!this._common.remocon.remoconTable) return false;
    if(!(name in this._common.remocon.remoconTable)) return false;
    let cmd = 'ir 01';
    const code = this._common.remocon.remoconTable[name].code;
    for(let i = 0; i < code.length; i++) {
      cmd += ' ' + ('0' + code[i].toString(16)).slice(-2);
    }
    this._SendData({type:'command', device: device, command: cmd, origin: origin});
    return true;
  }
  
  _Receive(msg) {
    switch(msg.type) {
    case 'change':
      this._common.ControllerLog(msg);
      this._common.emit('changeStatus', this, msg);
      // fall through
    case 'interval':
      for(let d of msg.data) {
        if((d.type == 'noise') && ((d.func == 'ad0') || (d.func == 'ad1'))) continue;
        if((d.type != 'noise') && ((d.func == 'max0') || (d.func == 'max1'))) continue;
        d.func = d.func.replace('max', 'ad');
        let f = false;
        for(let i in this._common.status) {
          const st = this._common.status[i];
          if((st.device == d.device) && (st.func == d.func)) {
            this._common.status[i] = d;
            f = true;
            break;
          }
        }
        if(!f) this._common.status.push(d);
      }
      this._common.emit('statusNotify', this);
      break;
    case 'irreceive':
      [msg.data[0].name, msg.data[0].comment, msg.data[0].group] = this._RemoconCodeSearch(msg.data[0].code);
      this._common.ControllerLog(msg);
      this._common.emit('irReceive', this, msg);
      break;
    case 'xbeeKeyInfo':
      this._common.systemConfig.xbeeKey = msg.data;
      break;
    case 'deviceInfo':
      this._common.deviceInfo = msg.data;
      this._common.emit('deviceInfo', this, msg);
      break;
    case 'queueInfo':
      this._common.emit('queueInfo', this, msg);
      break;
    case 'motor':
      this._common.emit('motor', this, msg);
      break;
    case 'response':
      if(msg.data[0].origin && msg.data[0].origin.macro) break;
      if((msg.data[0].command.indexOf('config') == 0) && msg.data[0].result) {
        this._common.emit('requestAuthkey', this, msg);
        break;
      }
      this._common.ControllerLog(msg);
      this._common.emit('response', this, msg);
      break;
    case 'message':
      this._common.emit('message', this, msg);
      break;
    default:
      console.log('controller message error :', msg);
      break;
    }
  }

  _StatusAlias(data) {
    if(!Array.isArray(data)) return;
    for(let i in data) {
      const d = data[i];
      if((parseInt(d.device, 16) == 0) || (d.device == 'server')) {
        d.deviceName = 'server';
      } else if(this._common.alias && (d.device in this._common.alias)) {
        d.deviceName = this._common.alias[d.device].name;
        if(!d.func) continue;
        if(d.func.replace('max', 'ad') in this._common.alias[d.device]) {
          const aliasf = this._common.alias[d.device][d.func.replace('max', 'ad')];
          d.funcName = aliasf.name;
          if('valueLabel' in aliasf) {
            if(aliasf.valueLabel[d.value]) {
              d.valueName = aliasf.valueLabel[d.value];
            }
          }
          if((d.func == 'ad0') || (d.func == 'ad1') || (d.func == 'ad2') || (d.func == 'ad3') || (d.func == 'max0') || (d.func == 'max1')) {
            if((aliasf.offset != null) && (aliasf.gain != null)) {
              d.value = ((parseFloat(d.value) + parseFloat(aliasf.offset)) * parseFloat(aliasf.gain)).toFixed(1);
              d.unit = aliasf.unit;
              d.valueName = d.value + d.unit;
              d.type = aliasf.type;
            }
          }
          if((d.func == 'gpio0') || (d.func == 'gpio1') || (d.func == 'gpio2') || (d.func == 'gpio3')) {
            d.type = aliasf.type;
          }
          if(d.func == 'sw') {
            const swLabel = ['open', 'close', 'off', 'on', 'unknown', 'opening', 'closing', 'error'];
            if((d.value >= 0) && (d.value < 8)) {
              d.valueName = swLabel[d.value];
            }
          }
        }
      }
    }
  }

  _RemoconCodeSearch(code) {
    let offset = 0;
    let length = 0;
    if((code[0] != 0) || (code[1] != code.length) || !code[2] || ((code[2] > 3) && (code[2] < 0xff))) return [null, null, null];

    if(code[2] < 4) {
      offset = 4;
      length = code[1] - 4;
    } else {
      offset = 5;
      length = code[3];
    }

    for(let name in this._common.remocon.remoconTable) {
      const tcode = this._common.remocon.remoconTable[name].code;
      let f = true;
      for(let i = offset; i < offset + length; i++) {
        if(code[i] != tcode[i]) {
          f = false;
          break;
        }
      }
      if(f) return [name, this._common.remocon.remoconTable[name].comment, this._common.remocon.remoconTable[name].group];
    }

    let str = '';
    for(let i = offset; i < offset + length; i++) {
      str += ('0' + code[i].toString(16)).slice(-2) + ' ';
    }
    return [null, str, null];
  }

  _SendData(msg) {
    this._client.write(JSON.stringify(msg));
  }
}

module.exports = ControllerConnection;
