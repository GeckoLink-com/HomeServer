//
// ControllerConnection.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const net = require('net');

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
    this.common.on('initializeAfterSetUID', this.IntervalConnect.bind(this));
  }
  
  IntervalConnect() {
    if(this.connectState == 0) {
      this.connectState = 1;
      this.client = net.connect(this.controllerPort, this.controllerHost);

      this.client.on('connect', () => {
        this.connectState = 2;
        this.connectMessage = true;
        console.log('connect controller : ', this.controllerHost);
        this.client.setEncoding('utf8');
      });

      this.client.on('data', (data) => {
        if(this.connectState == 2) {
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
              if(msg) this.Receive(msg);
            }
          }
        }
      });

      this.client.on('end', () => {
        console.log('disconnect controller : ', this.controllerHost);
        this.connectMessage = false;
        this.connectState = 0;
      });

      this.client.on('close', () => {
        console.log('disconnect by close controller : ', this.controllerHost);
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
    msg.type = 'command';
    if(!Array.isArray(msg.command)) msg.command = msg.command.replace("'", '');
    this.common.ControllerLog(msg);
    let device = msg.device;
    let deviceName = msg.deviceName;
    if(!deviceName && ((device === 0) || (device === '0') || (device === 'server'))) {
      device = '0';
      deviceName = 'server';
    }
    if(deviceName != 'server') {
      if(this.common.aliasTable && this.common.aliasTable[deviceName]) {
        device = this.common.aliasTable[deviceName].device;
      }
      if(!device) device = deviceName;
      if(!deviceName && this.common.alias[device]) deviceName = this.common.alias[device].name;
      if(!deviceName) deviceName = device;
      if(device.match(/^Hue_/) || deviceName.match(/^Hue_/)) return;
    }
    let commands = msg.command;
    if(!Array.isArray(commands)) commands = [commands];
    for(const command of commands) {
      if(!command) continue;
      let func = command.replace(/[ \t].*$/, '');
      let param = command.replace(func, '').trim();
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

      // virtual switch
      if(func.indexOf('vsw') >= 0) {
        const status = [];
        if(!this.common.status[`${deviceName}:${func}`]) {
          this.common.status[`${deviceName}:${func}`] = {
            device: deviceName,
            deviceName: deviceName,
            func: func,
            funcName: this.common.alias[0][func] ? this.common.alias[0][func].name : func,
            type: 'other',
          };
        }
        this.common.status[`${deviceName}:${func}`].value = param;
        this.common.status[`${deviceName}:${func}`].valueName = param;
        if(!this.common.internalStatus[deviceName]) this.common.internalStatus[deviceName] = {};
        this.common.internalStatus[deviceName][func] = Object.assign(this.common.internalStatus[deviceName][func] || {}, this.common.status[`${deviceName}:${func}`]);
        this.common.emit('changeInternalStatus', this);
        status.push(Object.assign({}, this.common.status[`server:${func}`]));
        this.common.emit('changeStatus', this, { type: 'change', data: status });

        this.common.emit('response', this, {
          type: 'response',
          data: [{
            type: 'command',
            origin: msg,
            device: device,
            deviceName: deviceName,
            command: msg.command,
            status: 'ok',
          }],
        });
        continue;
      }

      let cmd = (func + ' ' + param).replace(/[ \t]*$/, '');

      // remocon
      let f = this.SendRemoconCommand(msg, device, command);
      if(f) {
        const status = [];
        let type = null;
        const prefix = func.replace(/_[^_]*$/, '');
        if(this.common.remocon && this.common.remocon.remoconGroup && this.common.remocon.remoconGroup[prefix]) {
          type = this.common.remocon.remoconGroup[prefix].type;
        }
        if(!this.common.status[`${deviceName}:remocon`]) {
          this.common.status[`${deviceName}:remocon`] = {
            device: device,
            deviceName: deviceName,
            func: 'remocon',
            funcName: 'remocon',
            type: type,
            value: func,
            valueName: func,
          };
        }
        if(!this.common.internalStatus[deviceName]) this.common.internalStatus[deviceName] = {};
        this.common.internalStatus[deviceName].remocon = Object.assign(this.common.internalStatus[deviceName].remocon || {}, this.common.status[`${deviceName}:remocon`]);
        status.push(Object.assign({}, this.common.status[`${deviceName}:remocon`]));

        const value = func.replace(`${prefix}_`, '');
        if(type === 'aircon') {
          const mode = value.replace(/[0-9.]*$/, '');
          const temp = parseFloat(value.replace(/^[^0-9.]*/, ''));
          if(!this.common.status[`${deviceName}:${prefix}`]) {
            this.common.status[`${deviceName}:${prefix}`] = {
              device: device,
              deviceName: deviceName,
              func: prefix,
              funcName: prefix,
              type: type,
            };
          }
          this.common.status[`${deviceName}:${prefix}`].value = mode+temp;
          this.common.status[`${deviceName}:${prefix}`].valueName = mode+temp;
          this.common.status[`${deviceName}:${prefix}`].mode = mode;
          if(temp > 0) this.common.status[`${deviceName}:${prefix}`][mode] = temp;
        } else if(type === 'tv') {
          if(!this.common.status[`${deviceName}:${prefix}`]) {
            this.common.status[`${deviceName}:${prefix}`] = {
              device: device,
              deviceName: deviceName,
              func: prefix,
              funcName: prefix,
              type: type,
            };
          }
          this.common.status[`${deviceName}:${prefix}`].value = value;
          this.common.status[`${deviceName}:${prefix}`].valueName = value;
          if(['UHF', 'CS', 'BS'].indexOf(value) >= 0) {
            this.common.status[`${deviceName}:${prefix}`].net = value;
            this.common.status[`${deviceName}:${prefix}`].switch = 'on';
          }
          if(value.match(/^[0-9]*$/)) {
            this.common.status[`${deviceName}:${prefix}`].ch = value;
            this.common.status[`${deviceName}:${prefix}`].switch = 'on';
          }
          if(['on', 'off'].indexOf(value) >= 0) {
            this.common.status[`${deviceName}:${prefix}`].switch = value;
          }
        } else if(type != null) {
          if(!this.common.status[`${deviceName}:${prefix}`]) {
            this.common.status[`${deviceName}:${prefix}`] = {
              device: device,
              deviceName: deviceName,
              func: prefix,
              funcName: prefix,
              type: type,
            };
          }
          this.common.status[`${deviceName}:${prefix}`].value = value;
          this.common.status[`${deviceName}:${prefix}`].valueName = value;
        }
        if(!this.common.internalStatus[deviceName]) this.common.internalStatus[deviceName] = {};
        this.common.internalStatus[deviceName][prefix] = Object.assign(this.common.internalStatus[deviceName][prefix] || {}, this.common.status[`${deviceName}:${prefix}`]);
        status.push(Object.assign({}, this.common.status[`${deviceName}:${prefix}`]));
        this.common.emit('changeInternalStatus', this);
        this.common.emit('changeStatus', this, { type: 'change', data: status });
        continue;
      }

      // remocon macro
      if(this.common.remocon && this.common.remocon.remoconMacro && (func in this.common.remocon.remoconMacro)) {
        this.SendRemoconMacro(msg, device, this.common.remocon.remoconMacro[func].macro, 0);
        continue;
      }

      // dimmerLight/colorLight command
      if((func === 'switch') || (func === 'led') || (func === 'dmx') || (func === 'pwm')) {
        let options = {};
        let type = '';
        let recordFunc = func;
        let recordParam = param;
        const status = [];
        for(const item of this.common.uiTable.ItemList) {
          if(item.table && (item.table.deviceName === deviceName) &&
            ((item.table.type === func) || (func === 'switch'))) {
            options = item.table;
            type = item.type;
            func = item.table.type;
            break;
          }
        }
        let n = 3;
        if(type === 'dimmerLight') {
          n--;
          if(!options.dimmer) n--;
          if(!options.colorTemp) n--;
        }

        if(param === 'on') {
          recordFunc = 'switch';
          param = (this.common.internalStatus[deviceName] && this.common.internalStatus[deviceName][func]) ? this.common.internalStatus[deviceName][func].value : null;
          if(!param) {
            if(func === 'led') param = '808080';
            if(func === 'dmx') {
              param = options.dmxAddress;
              for(let i = 0; i < n; i++) {
                param += ' 128';
              }
            }
            if(func === 'pwm') param = '128 128';
          }
        } else if(param === 'off') {
          recordFunc = 'switch';
          if(func === 'led') param = '000000';
          if(func === 'dmx') {
            param = options.dmxAddress;
            for(let i = 0; i < n; i++) {
              param += ' 0';
            }
          }
          if(func === 'pwm') param = '0 0';
          recordFunc = 'switch';
        }

        this.SendData({type:'command', device: device, command: func + ' ' + param, origin: msg, auth: msg.auth});
        if(recordParam !== 'off') {
          if(!this.common.status[`${deviceName}:${func}`]) this.common.status[`${deviceName}:${func}`] = {
            device: device,
            deviceName: deviceName,
            func: func,
            funcName: func,
            type: func,
          };
          this.common.status[`${deviceName}:${func}`].value = param;
          this.common.status[`${deviceName}:${func}`].valueName = param;
          if(!this.common.internalStatus[deviceName]) this.common.internalStatus[deviceName] = {};
          this.common.internalStatus[deviceName][func] = Object.assign(this.common.internalStatus[deviceName][func] || {}, this.common.status[`${deviceName}:${func}`]);
          status.push(Object.assign({}, this.common.status[`${deviceName}:${func}`]));
        }
        if(func !== recordFunc) {
          if(!this.common.status[`${deviceName}:${recordFunc}`]) this.common.status[`${deviceName}:${recordFunc}`] = {
            device: device,
            deviceName: deviceName,
            func: recordFunc,
            funcName: recordFunc,
            type: func,
          };
          this.common.status[`${deviceName}:${recordFunc}`].value = recordParam;
          this.common.status[`${deviceName}:${recordFunc}`].valueName = recordParam;
          this.common.internalStatus[deviceName][recordFunc] = Object.assign(this.common.internalStatus[deviceName][recordFunc] || {}, this.common.status[`${deviceName}:${recordFunc}`]);
          status.push(Object.assign({}, this.common.status[`${deviceName}:${recordFunc}`]));
        }
        this.common.emit('changeInternalStatus', this);
        this.common.emit('changeStatus', this, { type: 'change', data: status });
        continue;
      }

      // command
      this.SendData({type:'command', device: device, command: cmd, origin: msg, auth: msg.auth});
      this.common.emit('changeInternalStatus', this);
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
      /*
        msg : {
          type: 'change',
          data: [{
            func: <string>,
            device: <string>,
            value: <string>,
          }]
        }
      */
      this.DeviceAlias(msg.data);
      this.FuncAlias(msg.data);
      this.common.ControllerLog(msg);
      // fall through
    case 'interval':
      /*
        msg : {
          type: 'interval',
          data: [{
            func: <string>,
            device: <string>,
            value: <string>,
          }, ....]
        }
      */
      if(msg.type === 'interval') {
        this.DeviceAlias(msg.data);
        this.FuncAlias(msg.data);
      }
      for(const d of msg.data) {
        if(d.type === 'noise') {
          if(['ad0', 'ad1'].indexOf(d.func) >= 0) continue;
          d.func = d.func.replace('max', 'ad');
          this.common.status[`${d.deviceName}:${d.func}`] = d;
        } else {
          if(['max0', 'max1'].indexOf(d.func) >= 0) continue;
          this.common.status[`${d.deviceName}:${d.func}`] = d;
        }
      }
      if(msg.type === 'change') this.common.emit('changeStatus', this, msg);
      this.common.emit('statusNotify', this);
      break;
    case 'irreceive':
      /*
        msg: {
          type:"irreceive",
          data:[{
            device:<string>,
            format:<string>,
            code:[<integer> ...]
          }]
        }
      */
      this.DeviceAlias(msg.data);
      [msg.data[0].name, msg.data[0].comment, msg.data[0].group] = this.RemoconCodeSearch(msg.data[0].code);
      this.common.ControllerLog(msg);
      this.common.emit('irReceive', this, msg);
      break;
    case 'motor':
      /*
        msg: {
          type:"motor",
          data:[{
            device:<string>,
            status:<string>, // ok or error
            sequence:<num>,
            count:<num>
          }]
        }
      */
      this.DeviceAlias(msg.data);
      this.common.emit('motor', this, msg);
      break;
    case 'reboot':
      /*
      msg: {
        type:"reboot",
        data:[{
          device:<string>,
          reason:<string>,
          version:<string>,
        }]
      }
      */
      this.DeviceAlias(msg.data);
      this.common.emit('reboot', this, msg);
      break;
    case 'deviceInfo':
      /*
        msg: {
          type:"deviceInfo",
          data:[{
            device:<string>,
            type:<string>,
            networkAddr:<string>,
            option:<string>,
            param:<string>,
            version:<string>,
            xbeeVersion:<string>,
            revision:<string>,
            voltage:<string>,
            state:<string>,
            fwupdateNum: <num>,
            fwupdateSeq: <num>
          },....]
        }
      */
      this.DeviceAlias(msg.data);
      this.common.deviceInfo = msg.data;
      this.common.emit('deviceInfo', this, msg);
      break;
    case 'xbeeKeyInfo':
      /*
        msg: {
          type:"xbeeKeyInfo",
          data:[ ... ]
        }
      */
      this.common.systemConfig.xbeeKey = msg.data;
      break;
    case 'queueInfo':
      /*
        msg: {
          type:"queueInfo",
          data:{
            writeQueue:[{
              device: <addrL>,
              command: <command>,
              sendTime: <sendTime>,
              waitMSec: <wait>,
              nextTime: <nextTime>,
              sequenceID: <seqID>,
              state: <state>,
              data: [<byte>....<byte>]
            }, ....],
            readQueue:[{
              receiveTime: <receiveTime>,
              data: [<byte>.....<byte>]
            }, ....],
          }
        }
      */
      this.common.emit('queueInfo', this, msg);
      break;
    case 'response':
      /*
        msg: {
          type: "response",
          data: [{
            status:<string>, // ok or error
            message:<string>,
          }],
        }
      */
      if(msg.data[0].origin && msg.data[0].origin.macro) break;
      if((msg.data[0].command.indexOf('config') == 0) && msg.data[0].result) {
        this.common.emit('requestAuthkey', this, msg);
        break;
      }
      this.common.ControllerLog(msg);
      this.common.emit('response', this, msg);
      break;
    case 'message':
      /*
        msg: {
          type: "message",
          data: [{
            message:<string>,
          }],
        }
      */
      this.common.emit('message', this, msg);
      break;
    default:
      console.log('controller message error :', msg);
      break;
    }
  }

  DeviceAlias(data) {
    for(const d of data) {
      if((parseInt(d.device, 16) === 0) || (d.device === 'server')) {
        d.deviceName = 'server';
      }
      if(this.common.alias && this.common.alias[d.device]) {
        d.deviceName = this.common.alias[d.device].name;
      }
    }
  }

  FuncAlias(data) {
    for(const d of data) {
      if(!d.func) continue;
      const func = d.func.replace('max', 'ad');
      if(this.common.alias[d.device][func]) {
        const funcAlias = this.common.alias[d.device][func];
        d.funcName = funcAlias.name;
        if(funcAlias.valueLabel) {
          if(funcAlias.valueLabel[d.value]) {
            d.valueName = funcAlias.valueLabel[d.value];
          }
        }
        const swLabel = ['open', 'close', 'off', 'on', 'unknown', 'opening', 'closing', 'error'];
        switch(func) {
        case 'ad0':
        case 'ad1':
        case 'ad2':
        case 'ad3':
          if(funcAlias.offset == null) continue;
          if(funcAlias.gain == null) continue;
          d.value = ((parseFloat(d.value) + parseFloat(funcAlias.offset)) * parseFloat(funcAlias.gain)).toFixed(1);
          d.unit = funcAlias.unit;
          d.valueName = d.value + d.unit;
          d.type = funcAlias.type;
          break;
        case 'gpio0':
        case 'gpio1':
        case 'gpio2':
        case 'gpio3':
        case 'hai0':
        case 'hai1':
        case 'swio0':
        case 'swio1':
        case 'swio2':
          d.type = funcAlias.type;
          break;
        case 'sw':
          if((d.value >= 0) && (d.value < 8)) d.valueName = swLabel[d.value];
          break;
        default:
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
      if(!tcode) {
        console.log('no code in remocon ', name);
        continue;
      }
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
    if(!this.client || (this.connectState === 0)) {
      console.log('error : no controller connection');
      return;
    }
    this.client.write(JSON.stringify(msg));
  }
}

module.exports = ControllerConnection;
