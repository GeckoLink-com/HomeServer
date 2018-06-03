//
// ControllerConnection.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const net = require('net');
const gpio = require('rpi-gpio');

class ControllerConnection {

  constructor(common) {
  
    this.common = common;

    this.connectState = 0;
    this.client = null;
    this.connectMessage = true;
    this.controllerHost = this.common.config.controllerHost;
    this.controllerPort = this.common.config.controllerPort;
    this.intervalId = null;
    this.lastStr = '';
    this.shutdownTimder = null;

    this.common.on('sendControllerCommand', this.ExecCommand.bind(this));
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.common.on('changeSystemConfig', (_caller) => {
      if(!this.common.systemConfig) return;
      this.IntervalConnect();
    });

    gpio.on('change', (ch, value) => {
      if(!value) {
        console.log('start shutdown count');
        this.shutdownTimer = setTimeout(() => {
          console.log('shutdown');
          this.ExecCommand(this, {
            deviceName: 'server',
            command: 'shutdown',
          });
        }, 5000);
      } else {
        if(this.shutdownTimer) clearTimeout(this.shutdownTimer);
        this.shutdownTimer = null;
      }
    });
    gpio.setMode(gpio.MODE_BCM);
    gpio.setup(5, gpio.DIR_IN, gpio.EDGE_BOTH);
  }
  
  IntervalConnect() {
    if(this.connectState == 0) {
      this.client = net.connect(this.controllerPort, this.controllerHost);

      this.client.on('connect', () => {
        this.connectState = 1;
        this.connectMessage = true;
        console.log('connect controller : ', this.controllerHost);
        this.client.setEncoding('utf8');
      });

      this.client.on('data', (data) => {
        if(this.connectState == 1) {
          const strs = (this.lastStr + data).split('\0');
          for(const i in strs) {
            this.lastStr = '';
            if(strs[i].length) {
              let msg = null;
              try {
                msg = JSON.parse(strs[i]);
              } catch(e) {
                this.lastStr = strs[i];
                if(i < strs.length - 1) {
                  console.log('ControllerConnections: json parse error : ', strs);
                  console.log(data.length);
                }
              }
              if(msg) {
                this.StatusAlias(msg.data);
                this.Receive(msg);
              }
            }
          }
        }
      });

      this.client.on('end', () => {
        console.log('disconnect controller : ', this.controllerHost);
        this.connectMessage = false;
        this.connectState = 0;
      });

      this.client.on('error', (e) => {
        this.connectState = 0;
        this.client.destroy();
        if((e.syscall == 'getaddrinfo') && (e.errno == 'ENOTFOUND')) {
          if(this.connectMessage) console.log('ControlServer address error %s:%d', e.host, e.port);
          this.connectMessage = false;
          return;
        }
        if((e.syscall == 'connect') && (e.errno == 'ECONNREFUSED')) {
          if(this.connectMessage) console.log('ControlServer connect error %s:%d', e.address, e.port);
          this.connectMessage = false;
          return;
        }

        console.log('----');
        console.log('[ error ]');
        console.log(Date());
        console.log(e.stack);
        console.log('----');
      });
    }
    if(this.intervalId == null) {
      this.intervalId = setInterval(() => { this.IntervalConnect(); }, 5 * 1000);
    }
  }
  
  ExecCommand(caller, msg) {
    let device = 0;
    msg.type = 'command';
    if(!Array.isArray(msg.command)) msg.command = msg.command.replace("'", '');
    this.common.ControllerLog(msg);
    if(msg.deviceName != 'server') {
      if(this.common.aliasTable && msg.deviceName && (msg.deviceName in this.common.aliasTable)) {
        device = this.common.aliasTable[msg.deviceName].device;
      } else {
        device = msg.device || msg.deviceName;
      }
      if(device.match(/^Hue_/)) return;
    }
    let commands = msg.command;    
    if(!Array.isArray(commands)) commands = [commands];
    for(const command of commands) {
      if(!command) continue;
      let func = command.replace(/[ \t].*$/, '');
      let param = command.replace(func, '').replace(/^[ \t]*/, '');
      if(func in this.common.aliasTable) {
        device = this.common.aliasTable[func].device;
        func = this.common.aliasTable[func].func;
      }
      if((func != 'name') && (device != 0) && (device in this.common.alias) &&
         (func in this.common.alias[device]) &&
         ('valueLabel' in this.common.alias[device][func])) {
        for(const i in this.common.alias[device][func].valueLabel) {
          if(param == this.common.alias[device][func].valueLabel[i]) {
            param = i;
            break;
          }
        }
      }
      if(!this.common.internalStatus.lastCommand) this.common.internalStatus.lastCommand = {};
      if(!this.common.internalStatus.lastCommand[msg.deviceName]) this.common.internalStatus.lastCommand[msg.deviceName] = {};

      // virtual switch
      if(func.indexOf('vsw') >= 0) {
        if(!('virtualSW' in this.common.internalStatus)) this.common.internalStatus.virtualSW = {};
        this.common.internalStatus.virtualSW[func] = param;
        this.common.internalStatus.lastCommand[msg.deviceName][func] = param;
        this.common.emit('changeInternalStatus', this);
        this.common.emit('response', this, {
          type: 'response',
          data: [{
            type: 'command',
            origin: msg,
            device: device,
            deviceName: msg.deviceName,
            command: msg.command,
            status: 'ok',
          }],
        });
        continue;
      }

      let cmd = (func + ' ' + param).replace(/[ \t]*$/, '');

      // remocon
      let f = this.SendRemoconCommand(msg, device, func);
      if(f) {
        let type = null;
        const prefix = func.replace(/_[^_]*$/, '');
        if(this.common.remocon && this.common.remocon.remoconGroup && this.common.remocon.remoconGroup[prefix]) {
          type = this.common.remocon.remoconGroup[prefix].type;
        }
        this.common.internalStatus.lastCommand[msg.deviceName] = {
          remocon: func,
          type: type,
        };
        this.common.emit('changeInternalStatus', this);
        continue;
      }

      // remocon macro
      if(this.common.remocon && this.common.remocon.remoconMacro && (func in this.common.remocon.remoconMacro)) {
        this.SendRemoconMacro(msg, device, this.common.remocon.remoconMacro[func].macro, 0);
        this.common.internalStatus.lastCommand[msg.deviceName][func.replace(/_[^_]*$/,'')] = func.replace(/^.*_/,'');
        continue;
      }

      // led command
      if(func === 'led') {
        if(param === 'on') {
          param = this.common.internalStatus.lastCommand[msg.deviceName][func];
          if(!param) param = 'ffffff';
        } else if(param === 'off') {
          param = '000000';
        } else {
          this.common.internalStatus.lastCommand[msg.deviceName][func] = param;
        }
        this.SendData({type:'command', device: device, command: func + ' ' + param, origin: msg, auth: msg.auth});
        const d = {
          device: device,
          deviceName: msg.deviceName,
          func: func,
          funcName: func,
          type: 'colorLight',
          value: param,
          valueName: parseInt(param, 16) ? 'on' : 'off',
        };
        let f = false;
        for(const i in this.common.status) {
          const st = this.common.status[i];
          if((st.device === device) && (st.func === func)) {
            this.common.status[i] = d;
            f = true;
          }
        }
        if(!f) this.common.status.push(d);
        this.common.emit('statusNotify', this);
        continue;
      }

      // command
      this.SendData({type:'command', device: device, command: cmd, origin: msg, auth: msg.auth});
      this.common.internalStatus.lastCommand[msg.deviceName][func] = param;
    }
  }

  SendRemoconMacro(origin, device, macro, p) {
    if(p >= macro.length) {
      this.common.emit('response', this, {
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
      setTimeout(this.SendRemoconMacro.bind(this), macro[p].wait, origin, device, macro, p+1);
    } else {
      if(macro[p].label && (macro[p].label != '')) {
        origin.macro = true;
        this.SendRemoconCommand(origin, device, macro[p].label);
      } else {
        let cmd = 'ir 01';
        const code = macro[p].code;
        for(let i = 0; i < code.length; i++) {
          cmd += ' ' + ('0' + code[i].toString(16)).slice(-2);
        }
        this.SendData({type:'command', device: device, command: cmd, origin: origin});
      }
      this.SendRemoconMacro(origin, device, macro, p+1);
    }
  }

  SendRemoconCommand(origin, device, name) {
    if(!this.common.remocon) return false;
    if(!this.common.remocon.remoconTable) return false;
    if(!(name in this.common.remocon.remoconTable)) return false;
    let cmd = 'ir 01';
    const code = this.common.remocon.remoconTable[name].code;
    for(let i = 0; i < code.length; i++) {
      cmd += ' ' + ('0' + code[i].toString(16)).slice(-2);
    }
    this.SendData({type:'command', device: device, command: cmd, origin: origin});
    return true;
  }
  
  Receive(msg) {
    switch(msg.type) {
    case 'change':
      this.common.ControllerLog(msg);
      this.common.emit('changeStatus', this, msg);
      // fall through
    case 'interval':
      for(const d of msg.data) {
        if((d.type == 'noise') && ((d.func == 'ad0') || (d.func == 'ad1'))) continue;
        if((d.type != 'noise') && ((d.func == 'max0') || (d.func == 'max1'))) continue;
        d.func = d.func.replace('max', 'ad');
        let f = false;
        for(const i in this.common.status) {
          const st = this.common.status[i];
          if((st.device == d.device) && (st.func == d.func)) {
            this.common.status[i] = d;
            f = true;
            break;
          }
        }
        if(!f) this.common.status.push(d);
      }
      this.common.emit('statusNotify', this);
      break;
    case 'irreceive':
      [msg.data[0].name, msg.data[0].comment, msg.data[0].group] = this.RemoconCodeSearch(msg.data[0].code);
      this.common.ControllerLog(msg);
      this.common.emit('irReceive', this, msg);
      break;
    case 'xbeeKeyInfo':
      this.common.systemConfig.xbeeKey = msg.data;
      break;
    case 'deviceInfo':
      this.common.deviceInfo = msg.data;
      this.common.emit('deviceInfo', this, msg);
      break;
    case 'queueInfo':
      this.common.emit('queueInfo', this, msg);
      break;
    case 'motor':
      this.common.emit('motor', this, msg);
      break;
    case 'response':
      if(msg.data[0].origin && msg.data[0].origin.macro) break;
      if((msg.data[0].command.indexOf('config') == 0) && msg.data[0].result) {
        this.common.emit('requestAuthkey', this, msg);
        break;
      }
      this.common.ControllerLog(msg);
      this.common.emit('response', this, msg);
      break;
    case 'message':
      this.common.emit('message', this, msg);
      break;
    default:
      console.log('controller message error :', msg);
      break;
    }
  }

  StatusAlias(data) {
    if(!Array.isArray(data)) return;
    for(const i in data) {
      const d = data[i];
      if((parseInt(d.device, 16) == 0) || (d.device == 'server')) {
        d.deviceName = 'server';
      } else if(this.common.alias && (d.device in this.common.alias)) {
        d.deviceName = this.common.alias[d.device].name;
        if(!d.func) continue;
        if(d.func.replace('max', 'ad') in this.common.alias[d.device]) {
          const aliasf = this.common.alias[d.device][d.func.replace('max', 'ad')];
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

  RemoconCodeSearch(code) {
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

    for(const name in this.common.remocon.remoconTable) {
      const tcode = this.common.remocon.remoconTable[name].code;
      let f = true;
      for(let i = offset; i < offset + length; i++) {
        if(code[i] != tcode[i]) {
          f = false;
          break;
        }
      }
      if(f) return [name, this.common.remocon.remoconTable[name].comment, this.common.remocon.remoconTable[name].group];
    }

    let str = '';
    for(let i = offset; i < offset + length; i++) {
      str += ('0' + code[i].toString(16)).slice(-2) + ' ';
    }
    return [null, str, null];
  }

  SendData(msg) {
    if(!this.client) {
      console.log('error : no controller connection');
      return;
    }
    this.client.write(JSON.stringify(msg));
  }
}

module.exports = ControllerConnection;
