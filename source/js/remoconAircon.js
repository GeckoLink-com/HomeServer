/*

  frontend/js/emoconAircon.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

class RemoconAircon {

  constructor(common) {

    this._common = common;
    
    this._lastRemoconCode = null;
    this._lastCode = null;
    this._dataLength = {};

    socket.on(this._common.eventFromBackend.events, (msg) => {
      if(msg.type != 'irreceive') return;
      if(msg.data[0].deviceName != 'server') return;
      if(this._vue.sequence < 1) return;

      const code = this._common.RemoconSearch(msg.data[0].code);
      this._lastRemoconCode = {
        name: code.name,
        code: msg.data[0].code,
        format: msg.data[0].format,
        info: code.name?(code.name+' ' + code.comment):code.code,
      };

      this._dataLength[this._lastRemoconCode.code.length] = (this._dataLength[this._lastRemoconCode.code.length] || 0) + 1;
      let l = 0;
      let m = -1;
      for(let i in this._dataLength) {
        if(this._dataLength[i] > m) {
          m = this._dataLength[i];
          l = i;
        }
      }
      this._vue.codeLength = l;

      this._ExecSequence(this._lastRemoconCode.info);
      this._lastCode = this._lastRemoconCode.info;
    });
    this._common.On(this._common.events.changeRemocon, () => {
      if(this._vue) this._vue.remocon = this._common.remocon;
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_remoconAircon').innerHTML = require('../view/remoconAircon.html');
      this._vue = new Vue({
        el: '#tab_remoconAircon',
        data: {
          remocon: this._common.remocon,
          name: '',
          nameValid: false,
          nameAlert: '登録名を4文字以上で入れてください。',
          comment: '',
          commentValid: false,
          commentAlert: 'コメントを入れてください。',
          sequence: 0,
          mode: 'heater',
          modeLabel: { heater: '暖房モード', cooler: '冷房モード', power: '' },
          lowTemp: {cooler:0, heater:0, power:0},
          highTemp: {cooler:0, heater:0, power:0},
          tempStep: {cooler:1, heater:1, power:0},
          remoconTable: {cooler:[], heater:[], power:[]},
          codeLength: -1,
          lastPtr: 0,
          tempPtr: 0,
        },
        computed: {
          lowTempShow: function() {
            return (this.lowTemp[this.mode] != 0) ||
                   ((this.sequence <= 10) && (this.sequence >= 3)) ||
                  ((this.sequence <= 30) && (this.sequence >= 23));
          },
          highTempShow: function() {
            return (this.highTemp[this.mode] != 0) ||
                   ((this.sequence <= 10) && (this.sequence >= 6)) ||
                   ((this.sequence <= 30) && (this.sequence >= 26));
          },
          tableShow: function() {
            return ((this.sequence >= 2) && (this.sequence <= 29));
          },

        },
        methods: {
          NameCheck: function() {
            if(this.name.length < 4) {
              this.nameValid = false;
              this.nameAlert = '登録名を4文字以上で入れてください。';
              return;
            }
            if(this.remocon.remoconGroup[this.name]) {
              this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？';
            } else {
              this.nameAlert = '';
            }
            this.nameValid = true;
          },
          CommentCheck: function() {
            if(this.comment.length == 0) {
              this.commentValid = false;
              this.commentAlert = 'コメントを入れてください。';
              return;
            }
            this.commentValid = true;
            this.commentAlert = '';
          },
          Start: () => {
            toastr.clear();
          　this._vue.sequence = 1;
            this._vue.remoconTable = {cooler:[], heater:[], power:[]};
            this._vue.nameAlert = '';
            this._lastCode = null;
            this._ExecSequence();
          },
          Stop: () => {
            toastr.clear();
            this._vue.sequence = 0;
            this._vue.lowTemp = {cooler:0, heater:0, power:0};
            this._vue.highTemp = {cooler:0, heater:0, power:0};
            this._ExecSequence();
          },
          Submit: () => {
            if(!this._vue.nameValid||!this._vue.commentValid) return;

            const mode = [{label:'heater', color:'#d93625'},
                        {label:'cooler', color:'#2586d9'}];
            const group = {type: 'aircon', comment: this._vue.comment};
            for(let m of mode) {
              const size = (this._vue.highTemp[m.label] - this._vue.lowTemp[m.label]) / this._vue.tempStep[m.label] + 1;
              for(let i = 0; i < size; i++) {
                const data = this._vue.remoconTable[m.label][i];
                const temp = this._vue.lowTemp[m.label] + i * this._vue.tempStep[m.label];
                Vue.set(this._vue.remocon.remoconTable, this._vue.name + '_' + m.label + temp, {
                  comment: this._vue.comment + m.label + temp,
                  code: data.code,
                  group: this._vue.name,
                });
              }
              group[m.label] = {color:m.color, min:this._vue.lowTemp[m.label], max:this._vue.highTemp[m.label], step:this._vue.tempStep[m.label]};
            }
            let l = this._vue.remoconTable['power'].length - 2;
            if(l < 0) l = 0;
            Vue.set(this._vue.remocon.remoconTable, this._vue.name + '_off', {comment: this._vue.comment + 'off', code: this._vue.remoconTable['power'][l].code, group:this._vue.name});
            Vue.set(this._vue.remocon.remoconGroup, this._vue.name, group);
            this._common.Trigger(this._common.events.changeRemocon, this);
            this._vue.sequence = 0;
            this._vue.name = '';
            this._vue.comment = '';
            toastr.success('登録完了しました。');
          },
          LowTemp: () => {
            if(!this._vue.lowTemp[this._vue.mode] || (this._vue.lowTemp[this._vue.mode] == '')) return;
            if((this._vue.sequence == 2) || (this._vue.sequence == 22)) this._vue.sequence++;
            this._ExecSequence();
          },
          TempStep: () => {
          },
          HighTemp: () => {
            if(!this._vue.highTemp[this._vue.mode] || (this._vue.highTemp[this._vue.mode] == '')) return;
            if((this._vue.sequence == 6) || (this._vue.sequence == 26)) this._vue.sequence++;
            this._ExecSequence();
          },
          CodeValid: function(idx) {
            if(!this.remoconTable[this.mode][idx] || !this.remoconTable[this.mode][idx].code) return false;
            if(this.remoconTable[this.mode][idx].code.length != this.codeLength) return false;
            for(let i in this.remoconTable[this.mode]) {
              const data = this.remoconTable[this.mode][i];
              if(!data || !data.info) continue;
              if(idx == i) continue;
              if(this.remoconTable[this.mode][idx].info == data.info) return false;
            }
            return true;
          },
        },
      });
      this._table = document.getElementById('airconTable');
    });
  }
  
  _ExecSequence(codeComment) {

    let reentry;
    do {
      reentry = false;
      switch(this._vue.sequence) {
      case 1:
        this._dataLength = {};
      case 21:
        if(this._vue.sequence == 1) {
          toastr.info('最初に暖房モードの設定をします。<br><strong>暖房モード</strong>に設定後、リモコンを本機に向けて温度を<strong>下げる</strong>ボタンを押して下さい。');
          this._vue.mode = 'heater';
        } else if(this._vue.sequence == 21) {
          toastr.success('暖房は完了です。<br>次に冷房モードの設定をします。<br><strong>冷房モード</strong>に設定後、リモコンを本機に向けて温度を<strong>下げる</strong>ボタンを押して下さい。');
          this._vue.mode = 'cooler';
        }
        this._vue.lowTemp[this._vue.mode] = 0;
        this._vue.tempStep[this._vue.mode] = 1;
        this._vue.highTemp[this._vue.mode] = 0;
        this._vue.sequence++;
        break;
      case 2:
      case 22:
        if(codeComment != this._lastCode) {
          toastr.info('続けて温度を<strong>下げる</strong>ボタンを押して下さい。');
          this._vue.lastPtr = 0;
          this._vue.remoconTable[this._vue.mode].unshift(this._lastRemoconCode);
          break;
        }
        this._vue.sequence++;
        reentry = true;
        break;
      case 3:
      case 23:
        if(!this._vue.lowTemp[this._vue.mode] || (this._vue.lowTemp[this._vue.mode] == 0)) {
          toastr.info('最低温度は何度になりましたか？<br>右側の<strong>最低温度</strong>と<strong>温度間隔</strong>を選んで下さい。');
          break;
        }
        reentry = true;
        this._vue.sequence++;
        break;
      case 4:
      case 24:
        this._vue.tempPtr = 1;
        toastr.info('今度は温度を<strong>上げる</strong>ボタンを押して下さい。');
        this._vue.sequence++;
        break;
      case 5:
      case 25:
        if(codeComment != this._lastCode) {
          if(this._vue.remoconTable[this._vue.mode].length <= this._vue.tempPtr) {
            this._vue.remoconTable[this._vue.mode].push(this._lastRemoconCode);
          } else if(!this._vue.remoconTable[this._vue.mode][this._vue.tempPtr] || (codeComment != this._vue.remoconTable[this._vue.mode][this._vue.tempPtr].comment)) {
            if(this._lastRemoconCode.code.length == this._vue.codeLength) {
              this._vue.remoconTable[this._vue.mode].splice(this._vue.tempPtr, 1, this._lastRemoconCode);
            }
          }
          this._vue.lastPtr = this._vue.tempPtr;
          this._vue.tempPtr++;
          toastr.info('続けて温度を<strong>上げる</strong>ボタンを押して下さい。');
          break;
        }
        this._vue.sequence++;
        reentry = true;
        break;
      case 6:
      case 26:
        if(!this._vue.highTemp[this._vue.mode] || (this._vue.highTemp[this._vue.mode] == 0)) {
          toastr.info('最高温度は何度になりましたか？<br>右側の<strong>最高温度</strong>を選んで下さい。');
          break;
        }
        reentry = true;
        this._vue.sequence++;
        break;
      case 7:
      case 27:
        if((this._vue.tempPtr - 1 == (this._vue.highTemp[this._vue.mode] - this._vue.lowTemp[this._vue.mode]) / this._vue.tempStep[this._vue.mode]) && this._CodeCheck()) {
          reentry = true;
          this._vue.sequence += 3;
          break;
        }
        toastr.error('途中でエラーが出ているので、<br>今度は温度を<strong>下げる</strong>ボタンを押して下さい。<br>反応をみてゆっくりと押して下さい。');
        this._vue.tempPtr = (this._vue.highTemp[this._vue.mode] - this._vue.lowTemp[this._vue.mode]) / this._vue.tempStep[this._vue.mode] - 1;
        if(this._vue.tempPtr < 0) this._vue.tempPtr = 1;
        if(this._vue.lastPtr != this._vue.tempPtr + 1) {
          this._vue.remoconTable[this._vue.mode].length = this._vue.tempPtr + 2;

          this._vue.remoconTable[this._vue.mode].splice(this._vue.tempPtr + 1, 1, this._vue.remoconTable[this._vue.mode][this._vue.lastPtr]);
          this._vue.lastPtr = this._vue.tempPtr + 1;
        }
        this._table.scrollTop = this._table.scrollHeight;
        if(codeComment == this._lastCode) break;
        this._vue.sequence++;
        if(codeComment) reentry = true;
        break;
      case 8:
      case 28:
        if(codeComment != this._lastCode) {
          if(!this._vue.remoconTable[this._vue.mode][this._vue.tempPtr] || (codeComment != this._vue.remoconTable[this._vue.mode][this._vue.tempPtr].comment)) {
            if(this._lastRemoconCode.code.length == this._vue.codeLength) {
              this._vue.remoconTable[this._vue.mode].splice(this._vue.tempPtr, 1, this._lastRemoconCode);
            }
          }
          this._vue.lastPtr = this._vue.tempPtr;
          this._vue.tempPtr--;
          if(this._vue.tempPtr < 0) this._vue.tempPtr = 0;
          toastr.info('続けて温度を<strong>下げる</strong>ボタンを押して下さい。');
          break;
        }
        if((this._vue.tempPtr == 0) && this._CodeCheck()) {
          reentry = true;
          this._vue.sequence += 2;
          break;
        }
        this._vue.sequence++;
      case 9:
      case 29:
        toastr.error('途中でエラーが出ているので、<br>今度は温度を<strong>上げる</strong>ボタンを押して下さい。');
        this._vue.tempPtr = 1;
        if(this._vue.lastPtr != 0) {
          this._vue.remoconTable[this._vue.mode].splice(0, 1, this._vue.remoconTable[this._vue.mode][this._vue.lastPtr]);
          this._vue.lastPtr = 0;
        }
        if(codeComment == this._lastCode) break;
        this._vue.sequence -= 4;
        if(codeComment) reentry = true;
        break;
      case 10:
        reentry = true;
        this._vue.sequence = 21;
        break;
      case 30:
        toastr.success('冷房は完了です。<br>最後に電源ボタンの登録をします。<br>リモコンを本機に向けて、<strong>電源(Off)ボタン</strong>を押して下さい。');
        this._vue.mode = 'power';
        this._vue.sequence++;
        break;
      case 31:
        toastr.info('リモコンの表示が電源off状態なのを確認して、<br><strong>電源(on)</strong>ボタンを押して下さい。');
        this._vue.remoconTable[this._vue.mode].push(this._lastRemoconCode);
        this._vue.sequence++;
        break;
      case 32:
        toastr.info('リモコンの表示が電源on状態なのを確認して、<br><strong>電源(off)</strong>ボタンを押して下さい。');
        this._vue.remoconTable[this._vue.mode].push(this._lastRemoconCode);

        const l = this._vue.remoconTable[this._vue.mode].length;
        if((l > 3) &&
           (this._vue.remoconTable[this._vue.mode][l-1].info == this._vue.remoconTable[this._vue.mode][l-3].info)) {
          this._vue.sequence = 40;
          reentry = true;
          break;
        }
        this._vue.sequence--;
        break;
      case 40:
        toastr.success('全て完了です。<br>保存ボタンを押して保存して下さい。');
        break;
      default:
      }
      if(this._table.scrollHeight != this._table.clientHeight) {
        Vue.nextTick(() => {
          const lineHeight = (this._table.scrollHeight - 23) / this._vue.remoconTable[this._vue.mode].length;
          const linePos = lineHeight * this._vue.lastPtr + 23;
          if(linePos - this._table.scrollTop > this._table.clientHeight - lineHeight - 30)
            this._table.scrollTop = linePos - (this._table.clientHeight - lineHeight - 30);
          if(linePos - this._table.scrollTop < 30)
            this._table.scrollTop = linePos - 30;
          if(this._vue.lastPtr == 0) this._table.scrollTop = 0;
        });
      }
    } while(reentry);
  }

  _CodeCheck() {
    const size = (this._vue.highTemp[this._vue.mode] - this._vue.lowTemp[this._vue.mode]) / this._vue.tempStep[this._vue.mode] + 1;
    if(size < 0) return false;
    for(let i = 0; i < size; i++) {
      if(!this._vue.CodeValid(i)) return false;
    }
    return true;
  }

}

module.exports = RemoconAircon;

