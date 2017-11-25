/*

  frontend/js/uiSetting.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

import Vue from 'vue';
import ViewUiSetting from '../view/uiSetting.html';

class UISetting {
  constructor(common) {
    this._common = common;
    this._select = false;

    this._common.On(this._common.events.changeAlias, () => {
      if(this._vue) {
        this._vue.alias = this._common.alias;
        this._vue.ChangeAlias();
      }
    });
    this._common.On(this._common.events.changeRemocon, () => {
      if(this._vue) this._vue.remocon = this._common.remocon;
    });
    this._common.On(this._common.events.changeHueBridges, () => {
      if(this._vue) this._vue.hueLights = this._common.hueLights;
    });
    this._common.On(this._common.events.changeUITable, () => {
      if(this._vue) this._vue.uiTable = this._common.uiTable;
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_uiSetting').innerHTML = ViewUiSetting;
      this._vue = new Vue({
        el: '#tab_uiSetting',
        data: {
          uiTable: this._common.uiTable,
          alias: this._common.alias,
          remocon: this._common.remocon,
          hueLights: this._common.hueLights,
          typeTable: [
            { value: 'room', label: 'ルーム', buttons: 0 },
            { value: 'disabled', label: '-----------------------', buttons: 0 },
            { value: 'brind', label: 'ブラインド/カーテン', buttons: 2 },
            { value: 'shutter', label: 'シャッター', buttons: 2 },
            { value: 'window', label: '窓', buttons: 2 },
            { value: 'lock', label: '電気錠', buttons: 2 },
            { value: 'tv', label: 'テレビ', buttons: 4 },
            { value: 'aircon', label: 'エアコン', buttons: 1 },
            { value: 'hue', label: 'Hue', buttons: 0 },
            { value: 'onOff', label: 'on/offスイッチ', buttons: 2 },
            { value: 'openClose', label: 'open/closeスイッチ', buttons: 2 },
            { value: 'other', label: 'その他', buttons: 4 },
          ],
          statusFunc: ['ad0', 'ad1', 'ad2', 'ad3', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'ha0', 'ha1', 'hai0', 'hai1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3', 'rainInfo', 'smartMeter'],
          commandFunc: ['gpio0', 'gpio1', 'ha0', 'ha1', 'hao0', 'hao1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3'],
          gpioinType: ['motion', 'alarm', 'flap', 'other'],

          selectedItem: { type: 'new', index: -1 },
          itemType: '',
          itemName: '',
          nameAlert: '',
          itemRoom: '',
          status: [],
          airconGroup: '',
          airconModule: '',
          hueLight: '',
          button: [],
          tvGroup: '',
          tvModule: '',
          sensorList: [{ }],
          commandList: [{ type: 'none' }],
          remoconTxList: [{ deviceName: 'server', label: '親機' }],
        },
        computed: {
          validTypeTable: function() {
            const table = [];
            for(const item of this.typeTable) {
              if(item.value === 'room') {
                if((this.selectedItem.type === 'room') ||
                   (this.selectedItem.type === 'new')) table.push(item);
              } else {
                if(this.selectedItem.type !== 'room') table.push(item);
              }
            }
            return table;
          },
          buttonNum: function() {
            for(const type of this.typeTable) {
              if(this.itemType === type.value) return type.buttons;
            }
          },
        },
        methods: {
          NameCheck: function() {
            if(this.itemName.length === 0) {
              this.nameAlert = '項目名を入れてください。';
              return;
            }
            this.nameAlert = '';
          },
          StatusItem: function(item, idx) {
            let stat = '';
            if(item.status && item.status[idx]) {
              stat = item.status[idx].sensor;
              if(item.status[idx].deviceName && item.status[idx].func) stat = item.status[idx].deviceName + ':' + item.status[idx].func;
            }
            return stat;
          },
          ButtonItem: function(item, idx) {
            let lbl = item.buttons[idx].label;
            if((item.type === 'tv') && (lbl === 'vol+')) lbl = 'v+';
            if((item.type === 'tv') && (lbl === 'vol-')) lbl = 'v-';
            return lbl;
          },
          ChangeAlias: function() {
            const sensorList = [{}];
            for(const dev in this.alias) {
              for(const func in this.alias[dev]) {
                if(this.statusFunc.indexOf(func) >= 0) {
                  if(((func === 'gpio0') || (func === 'gpio1')) &&
                     (this.alias[dev][func].type === 'out')) continue;
                  sensorList.push({
                    deviceName: this.alias[dev].name,
                    func: func,
                    label: this.alias[dev].name + ':' + func + ' ' + (this.alias[dev][func].name || ''),
                  });
                }
              }
            }
            this.sensorList = sensorList;

            const commandList = [{ type: 'none' }];
            for(const dev in this.alias) {
              for(const func in this.alias[dev]) {
                if(this.commandFunc.indexOf(func) >= 0) {
                  if(((func === 'gpio0') || (func === 'gpio1')) &&
                     (this.alias[dev][func].type !== 'out')) continue;
                  commandList.push({
                    deviceName: this.alias[dev].name,
                    func: func,
                    type: 'mode',
                    mode: this.alias[dev][func].valueLabel,
                    label: this.alias[dev].name + ':' + (this.alias[dev][func].name || func),
                  });
                }
              }
            }
            commandList.push({
              deviceName: '',
              func: 'remocon',
              type: 'remocon',
              label: 'リモコン',
            });
            commandList.push({
              deviceName: '',
              func: 'macro',
              type: 'macro',
              label: 'リモコンマクロ',
            });
            this.commandList = commandList;

            const txList = [{ deviceName: 'server', label: '親機' }];
            for(const dev in this.alias) {
              if(((parseInt(this.alias[dev].option, 16) >> 21) & 1) === 1) {
                txList.push({
                  deviceName: this.alias[dev].name,
                  label: this.alias[dev].name,
                });
              }
            }
            this.remoconTxList = txList;
          },
          RoomDeleteEnable(room) {
            if(this.selectedItem.type !== 'room') return false;
            if(this.selectedItem.index === 0) return false;
            for(const item of this.uiTable.ItemList) {
              if(item.room === room) return false;
            }
            return true;
          },
          SelectItem: function(type, idx) {
            if(type === 'room') {
              this.selectedItem = { type: 'room', index: idx };
              this.itemType = 'room';
              this.itemName = this.uiTable.RoomList[idx];
              this.NameCheck();
              return;
            }
            if(type === 'new') {
              this.selectedItem = { type: 'new', index: -1 };
              this.itemType = 'other';
              this.itemName = '新しい項目';
              this.NameCheck();
              this.itemRoom = 'ホーム';
              this.status = [];
              for(let i = 0; i < 2; i++) {
                this.status.push(this.sensorList[0]);
              }
              this.button = [];
              for(let i = 0; i < 4; i++) {
                this.button.push({
                  command: this.commandList[0],
                  mode: '',
                  remocon: '',
                  macro: '',
                  module: '',
                  label: '',
                });
              }
              this.airconGroup = '';
              this.airconModule = '';
              this.tvGroup = '';
              this.tvModule = '';
              return;
            }

            const item = this.uiTable.ItemList[idx];
            this.selectedItem = { type: item.type, index: idx };
            this.itemType = item.type;
            this.itemName = item.label;
            this.NameCheck();
            this.itemRoom = item.room;

            this.status = [];
            for(let i = 0; i < 2; i++) {
              let stat = this.sensorList[0];
              if(item.status && item.status[i]) {
                for(const j in this.sensorList) {
                  if((this.sensorList[j].deviceName === item.status[i].deviceName) &&
                     (this.sensorList[j].func === item.status[i].func)) {
                    stat = this.sensorList[j];
                    break;
                  }
                }
              }
              this.status.push(stat);
            }
            this.button = [];
            for(let i = 0; i < 4; i++) {
              let cmd = null;
              let mode = '';
              let remocon = '';
              let module = '';
              let label = '';
              let macro = '';
              if(item.buttons && item.buttons[i]) {
                for(const j in this.commandList) {
                  if((this.commandList[j].deviceName === item.buttons[i].deviceName) &&
                     (this.commandList[j].func === item.buttons[i].func)) {
                    cmd = this.commandList[j];
                    mode = item.buttons[i].mode;
                    break;
                  }
                }
                if(!cmd) {
                  for(const j in this.remocon.remoconTable) {
                    if(item.buttons[i].command === j) {
                      cmd = this.commandList[this.commandList.length - 2];
                      remocon = j;
                      module = item.buttons[i].deviceName;
                      label = item.buttons[i].label;
                      break;
                    }
                  }
                }
                if(!cmd) {
                  for(const j in this.remocon.remoconMacro) {
                    if(item.buttons[i].command === j) {
                      cmd = this.commandList[this.commandList.length - 1];
                      macro = j;
                      module = item.buttons[i].deviceName;
                      label = item.buttons[i].label;
                      break;
                    }
                  }
                }
              }
              if(!cmd) cmd = this.commandList[0];
              this.button.push({
                command: cmd,
                mode: mode,
                remocon: remocon,
                macro: macro,
                module: module,
                label: label,
              });
            }
            if(item.type === 'aircon') {
              this.airconGroup = item.table.prefix;
              this.airconModule = item.table.deviceName;
            }
            if(item.type === 'tv') {
              this.tvGroup = item.table.prefix;
              this.tvModule = item.table.deviceName;
            }
            if(item.type === 'hue') {
              for(const i in this.hueLights) {
                if(this.hueLights[i].name === item.table.deviceName) {
                  this.hueLight = this.hueLights[i];
                  break;
                }
              }
            }
          },
          DeleteItem: (type, idx) => {
            if(type === 'room') {
              const i = this._vue.uiTable.RoomList.indexOf(idx);
              if(i >= 0) this._vue.uiTable.RoomList.splice(i, 1);
            } else {
              this._vue.uiTable.ItemList.splice(idx, 1);
            }
            socket.emit(this._common.eventToBackend.uiTable, this._vue.uiTable);
            toastr.warning('削除されました。');
          },
          Submit: () => {
            if(this._vue.itemType === 'room') {
              for(const room of this._vue.uiTable.RoomList) {
                if(room === this._vue.itemName) {
                  this._vue.nameAlert = '存在するルーム名と同じ名前は付けられません。';
                  return;
                }
              }
              if(this._vue.selectedItem.type === 'new') {
                this._vue.uiTable.RoomList.push(this._vue.itemName);
              } else {
                const oldName = this._vue.uiTable.RoomList[this._vue.selectedItem.index];
                for(const item of this._vue.uiTable.ItemList) {
                  if(item.room === oldName) Vue.set(item, 'room', this._vue.itemName);
                }
                Vue.set(this._vue.uiTable.RoomList, this._vue.selectedItem.index, this._vue.itemName);
              }
              socket.emit(this._common.eventToBackend.uiTable, this._vue.uiTable);
              this._vue.selectedItem = { type: 'new', index: -1 };
              toastr.success('登録されました。');
              return;
            }

            const item = {
              type: this._vue.itemType,
              label: this._vue.itemName,
              room: this._vue.itemRoom,
            };

            for(const stat of this._vue.status) {
              if((stat.deviceName === '') || (stat.func === '')) continue;
              const dev = this._common.aliasTable[stat.deviceName].device;
              if(!dev) continue;
              if(!this._common.alias[dev]) continue;
              if(!this._common.alias[dev][stat.func]) continue;
              if(!item.status) item.status = [];
              item.status.push({
                deviceName: stat.deviceName,
                func: stat.func,
                sensor: this._common.alias[dev][stat.func].name || (stat.deviceName + ':' + stat.func),
                type: this._common.alias[dev][stat.func].type,
              });
            }

            for(const i in this._vue.button) {
              if(i >= this._vue.buttonNum) break;
              const btn = this._vue.button[i];
              if(!btn.command) continue;
              if(!item.buttons) item.buttons = [];
              switch (btn.command.type) {
                case 'mode':
                  item.buttons.push({
                    deviceName: btn.command.deviceName,
                    command: btn.command.func + ' ' + btn.mode,
                    func: btn.command.func,
                    mode: btn.mode,
                    label: btn.mode,
                  });
                  break;
                case 'remocon':
                  item.buttons.push({
                    command: btn.remocon,
                    deviceName: btn.module,
                    label: btn.label,
                  });
                  break;
                case 'macro':
                  item.buttons.push({
                    command: btn.macro,
                    deviceName: btn.module,
                    label: btn.label,
                  });
                  break;
                default:
              }
            }
            if(this._vue.itemType === 'aircon') {
              item.table = {
                prefix: this._vue.airconGroup,
                deviceName: this._vue.airconModule,
              };
            }
            if(this._vue.itemType === 'tv') {
              item.table = {
                prefix: this._vue.tvGroup,
                deviceName: this._vue.tvModule,
              };
            }
            if(this._vue.itemType === 'hue') {
              item.status = [{
                deviceName: this._vue.hueLight.name,
                func: 'hue',
                sensor: this._vue.hueLight.name,
                type: 'hue',
              }];
              item.buttons = [
                {
                  command: 'switch on',
                  deviceName: this._vue.hueLight.name,
                  label: 'on',
                },
                {
                  command: 'switch off',
                  deviceName: this._vue.hueLight.name,
                  label: 'off',
                },
              ];
              item.table = {
                prefix: '',
                deviceName: this._vue.hueLight.name,
                device: this._vue.hueLight.device,
              };
            }

            if(this._vue.selectedItem.type === 'new') {
              this._vue.uiTable.ItemList.push(item);
            } else {
              Vue.set(this._vue.uiTable.ItemList, this._vue.selectedItem.index, item);
            }
            socket.emit(this._common.eventToBackend.uiTable, this._vue.uiTable);
            this._vue.selectedItem = { type: 'new', index: -1 };
            toastr.success('登録されました。');
          },
        },
      });
      this._vue.SelectItem('new', -1);
      document.getElementById('ui-table').addEventListener('mousedown', this._Drag.bind(this));
      document.getElementById('ui-table').addEventListener('mouseup', this._Drop.bind(this));
      document.getElementById('ui-table').addEventListener('mousemove', this._Move.bind(this));
      document.addEventListener('mouseup', this._Release.bind(this));
    });
  }

  _getCursorLine(e) {
    const offsetY = e.layerY;
    const scrollTop = document.getElementById('ui-table').parentElement.scrollTop;
    const posY = offsetY + scrollTop;
    const uiTables = document.getElementById('ui-table').getElementsByTagName('table');
    for(let i = 0; i < uiTables.length; i++) {
      if((uiTables[i].offsetTop <= posY) &&
         (uiTables[i].offsetTop + uiTables[i].offsetHeight > posY)) {
        const tableOffset = posY - uiTables[i].offsetTop;
        const lines = uiTables[i].getElementsByTagName('tr');
        for(let j = 0; j < lines.length; j++) {
          if((lines[j].offsetTop <= tableOffset) &&
             (lines[j].offsetTop + lines[j].offsetHeight > tableOffset)) {
            const id = lines[j].dataset.id;
            return { room: i, index: id };
          }
        }
      }
    }
  }

  _Drag(e) {
    const pos = this._getCursorLine(e);
    this._select = parseInt(this._vue.selectedItem.index) === parseInt(pos.index);
    if(pos.index === 'room') this._select = this._vue.selectedItem.index === pos.room;
    if(!this._select) return;
    e.preventDefault();
    this._selectedPos = pos;
    this._currentPos = pos;
    if(pos.index === 'room') {
      this._dragItem = this._vue.uiTable.RoomList[pos.room];
    } else {
      this._dragItem = this._vue.uiTable.ItemList[pos.index];
    }
  }

  _Drop(e) {
    if(!this._select) return;
    e.preventDefault();
    socket.emit(this._common.eventToBackend.uiTable, this._vue.uiTable);
    toastr.success('修正されました。');
    this._select = false;
  }

  _Move(e) {
    if(!this._select) return;
    e.preventDefault();
    const pos = this._getCursorLine(e);
    if((pos.room === this._currentPos.room) &&
       (parseInt(pos.index) === parseInt(this._currentPos.index))) return;
    if(this._selectedPos.index === 'room') {
      if(pos.index !== 'room') return;
      if(pos.room === this._currentPos.room) return;
      this._vue.uiTable.RoomList.splice(this._currentPos.room, 1);
      this._vue.uiTable.RoomList.splice(pos.room, 0, this._dragItem);
      this._currentPos = pos;
      this._vue.selectedItem.index = this._currentPos.room;
    } else {
      if((pos.index === 'room') && (parseInt(pos.room) === 0)) return;
      this._vue.uiTable.ItemList.splice(this._currentPos.index, 1);
      if(pos.index === 'room') {
        if(pos.room === this._currentPos.room) {
          this._vue.uiTable.ItemList.push(this._dragItem);
          this._currentPos = { room: pos.room - 1, index: this._vue.uiTable.ItemList.length - 1 };
        } else {
          this._vue.uiTable.ItemList.unshift(this._dragItem);
          this._currentPos = { room: pos.room, index: 0 };
        }
      } else {
        this._vue.uiTable.ItemList.splice(pos.index, 0, this._dragItem);
        this._currentPos = pos;
      }
      this._vue.uiTable.ItemList[this._currentPos.index].room = this._vue.uiTable.RoomList[this._currentPos.room];
      this._vue.selectedItem.index = this._currentPos.index;
    }
  }
  _Release(e) {
    if(!this._select) return;
    e.preventDefault();
    this._select = false;
    if(this._selectedPos.index === 'room') {
      if(this._selectedPos.room === this._currentPos.room) return;
      this._vue.uiTable.RoomList.splice(this._currentPos.room, 1);
      this._vue.uiTable.RoomList.splice(this._selectedPos.room, 0, this._dragItem);
      this._currentPos = this._selectedPos;
      this._vue.selectedItem.index = this._currentPos.room;
    } else {
      if(parseInt(this._selectedPos.index) === parseInt(this._currentPos.index)) return;
      this._vue.uiTable.ItemList.splice(this._currentPos.index, 1);
      this._vue.uiTable.ItemList.splice(this._selectedPos.index, 0, this._dragItem);
      this._currentPos = this._selectedPos;
      this._vue.uiTable.ItemList[this._currentPos.index].room = this._vue.uiTable.RoomList[this._currentPos.room];
      this._vue.selectedItem.index = this._currentPos.index;
    }
  }
}

export default UISetting;
