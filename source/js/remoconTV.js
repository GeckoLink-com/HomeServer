/*

  frontend/js/remoconTV.js

  Copyright (C) 2016-2017 Mitsuru Nakada
  This software is released under the MIT License, see license file.

*/
'use strict';

class RemoconTV {

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

    this._remoconFunc = [
      {name: 'power', label:'電源'},
      {name: 'UHF', label:'地デジ'},
      {name: 'BS', label:'BS'},
      {name: 'CS', label:'CS'},
      {name: '1', label: '1'},
      {name: '2', label: '2'},
      {name: '3', label: '3'},
      {name: '4', label: '4'},
      {name: '5', label: '5'},
      {name: '6', label: '6'},
      {name: '7', label: '7'},
      {name: '8', label: '8'},
      {name: '9', label: '9'},
      {name: '10', label: '10'},
      {name: '11', label: '11'},
      {name: '12', label: '12'},
      {name: 'vol+', label: '音量＋'},
      {name: 'vol-', label: '音量-'},
    ];
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('tab_remoconTV').innerHTML = require('../view/remoconTV.html');
      this._vue = new Vue({
        el: '#tab_remoconTV',
        data: {
          remocon: this._common.remocon,
          name: '',
          nameValid: false,
          nameAlert: '登録名を4文字以上で入れてください。',
          comment: '',
          commentValid: false,
          commentAlert: 'コメントを入れてください。',
          sequence: 0,
          existName: false,
          codeLength: 0,
          remoconTable: [],
          remoconNo: 0,
          lastPtr: -1,
          channelTable: {
            type: 'tv',
            UHF:{
              label:'地デジ',
              display:true,
              '1':{ display:true, label:'NHK-G'},
              '2':{ display:true, label:'NHK-E'},
              '3':{ display:true, label:'TVK'},
              '4':{ display:true, label:'日テレ'},
              '5':{ display:true, label:'テレビ朝日'},
              '6':{ display:true, label:'TBS'},
              '7':{ display:true, label:'テレビ東京'},
              '8':{ display:true, label:'フジテレビ'},
              '9':{ display:true, label:'TOKYO MX'},
              '10':{ display:false, label:'地デジ10'},
              '11':{ display:false, label:'地デジ11'},
              '12':{ display:true, label:'放送大学'},
            },
            BS:{
              label:'BS',
              display:true,
              '1':{ display:true, label:'NHK BS-1'},
              '2':{ display:true, label:'NHK BS-2'},
              '3':{ display:true, label:'NHK BS-hi'},
              '4':{ display:true, label:'BS日テレ'},
              '5':{ display:true, label:'BS朝日'},
              '6':{ display:true, label:'BS-TBS'},
              '7':{ display:true, label:'BSジャパン'},
              '8':{ display:true, label:'BSフジ'},
              '9':{ display:true, label:'WOWOW'},
              '10':{ display:true, label:'STAR'},
              '11':{ display:true, label:'BS11'},
              '12':{ display:true, label:'TwellV'},
            }, 
            CS:{
              label:'CS',
              display:true,
              '1':{ display:true, label:'CS1'},
              '2':{ display:true, label:'CS2'},
              '3':{ display:true, label:'CS3'},
              '4':{ display:true, label:'CS4'},
              '5':{ display:true, label:'CS5'},
              '6':{ display:true, label:'CS6'},
              '7':{ display:true, label:'CS7'},
              '8':{ display:true, label:'CS8'},
              '9':{ display:true, label:'CS9'},
              '10':{ display:true, label:'CS10'},
              '11':{ display:true, label:'CS11'},
              '12':{ display:true, label:'CS12'},
            }
          },
        },
        methods: {
          NameCheck: function() {
            this.existName = false;
            if(this.name.length < 4) {
              this.nameValid = false;
              this.nameAlert = '登録名を4文字以上で入れてください。';
              return;
            }
            if(this.remocon.remoconGroup[this.name]) {
              this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？チャンネル設定を修正する場合、チャンネル修正ボタンを押してください。';
              if(this.remocon.remoconGroup[this.name].type == 'tv') this.existName = true;
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
            this._vue.sequence = 1;
            this._vue.remoconNo = 0;
            this._vue.nameAlert = '';
            this._RemoconInit();
            this._ExecSequence();
          },
          Stop: () => {
            toastr.clear();
            this._vue.sequence = 0;
            this._ExecSequence();
          },
          Modify: () => {
            toastr.info('右の表の各項目に名称を設定して保存を押して下さい。');
            this._vue.nameAlert = '';
            this._vue.sequence = 4;
            this._RemoconInit();
          },
          Submit: this._Submit.bind(this),
          CodeValid: function(idx) {
            if(!this.remoconTable[idx] || !this.remoconTable[idx].code) return false;
            if(this.remoconTable[idx].code.length != this.codeLength) return false;
            for(let i in this.remoconTable) {
              const data = this.remoconTable[i];
              if(!data || !data.info) continue;
              if(idx == i) continue;
              if(this.remoconTable[idx].info == data.info) return false;
            }
            return true;
          },
        },
      });
    });
  }

  _RemoconInit() {
    this._vue.remoconTable = [];
    for(let i = 0; i < this._remoconFunc.length; i++) {
      if(this._vue.name + '_' + this._remoconFunc[i].name in this._common.remocon.remoconTable) {
        const data = this._common.remocon.remoconTable[this._vue.name + '_' + this._remoconFunc[i].name];
        const code = this._common.RemoconSearch(data.code);
        this._vue.remoconTable.push({
          code: data.code,
          group: data.group,
          info: code.name?(code.name+' ' + code.comment):code.code,
          label: this._remoconFunc[i].label,
        });
      } else {
        this._vue.remoconTable.push({
          label: this._remoconFunc[i].label,
        });
      }
    }
    this._vue.remoconNo = 0;
    this._vue.lastPtr = -1;
    if(this._vue.remoconTable[0] && this._vue.remoconTable[0].code)
      this._vue.codeLength = this._vue.remoconTable[0].code.length;

    if(this._common.remocon.remoconGroup[this._vue.name] &&
       (this._common.remocon.remoconGroup[this._vue.name].type == 'tv')) {
      this._vue.channelTable = JSON.parse(JSON.stringify(this._common.remocon.remoconGroup[this._vue.name]));
    }
  }

  _ExecSequence(comment) {

    let reentry;
    do {
      reentry = false;
      switch(this._vue.sequence) {
      case 1:
        toastr.info('リモコンの<strong>' + this._remoconFunc[this._vue.remoconNo].label + '</strong>を押してください。');
        this._vue.sequence++;
        break;
      case 2:
        this._vue.remoconTable[this._vue.remoconNo] = this._lastRemoconCode;
        this._vue.remoconTable[this._vue.remoconNo].label = this._remoconFunc[this._vue.remoconNo].label;
        this._vue.lastPtr = this._vue.remoconNo;
        this._vue.remoconNo++;
        if(this._vue.remoconNo != this._remoconFunc.length) {
          reentry = true;
          this._vue.sequence--;
          break;
        }
        this._vue.sequence++;
      case 3:
        let err = this._CodeCheck();
        if(err != 0) {
          if(err == -1) toastr.error('リモコンコードが揃っていません。<br>再度指示に従ってボタンを押して下さい。');
          if(err == -2) toastr.error('リモコンコードの読み取りエラーがあります。<br>再度指示に従ってボタンを押して下さい。');
          if(err == -3) toastr.error('リモコンコードが重複しています。<br>再度指示に従ってボタンを押して下さい。');
          this._vue.remoconNo = 0;
          this._vue.sequence = 1;
          reentry = true;
          break;
        }
        toastr.info('次にチャンネル表示設定をします。<br>右の表の各項目に名称を設定して保存を押して下さい。');
        this._vue.sequence++;
        break;
      case 4:
        break;
      default:
      }
    } while(reentry);
  }

  _CodeCheck() {
    for(let i = 0; i < this._remoconFunc.length; i++) {
      if(!(i in this._vue.remoconTable) || !('code' in this._vue.remoconTable[i])) return -1;
      if(this._vue.remoconTable[i].code.length != this._vue.codeLength) return -2;
      for(let j = i + 1; j < this._remoconFunc.length; j++) {
        if(!(j in this._vue.remoconTable) || !('code' in this._vue.remoconTable[j])) return -1;
        if(this._vue.remoconTable[i].info == this._vue.remoconTable[j].info) return -3;
      }
    }
    return 0;
  }

  _Submit() {

    for(let i = 0; i < this._remoconFunc.length; i++) {
      this._common.remocon.remoconTable[this._vue.name + '_' + this._remoconFunc[i].name] = {
        comment: this._vue.comment + this._remoconFunc[i].label,
        code: this._vue.remoconTable[i].code,
        group:this._vue.name
      };
      const code = this._common.RemoconSearch(this._vue.remoconTable[i].code);
      if((this._vue.remoconTable[i].code[2] == 3) && (code.code.replace(/ /g,'') == '05150100')) {
        const offCode = [];
        const onCode = [];
        for(let j = 0; j < this._vue.remoconTable[i].code.length; j++) {
          offCode[j] = onCode[j] = this._vue.remoconTable[i].code[j];
        }
        offCode[5] = 0x2f;
        onCode[5] = 0x2e;
        this._common.remocon.remoconTable[this._vue.name + '_off'] = {
          comment: this._vue.comment + '電源オフ',
          code: offCode,
          group:this._vue.name
        };
        this._common.remocon.remoconTable[this._vue.name + '_on'] = {
          comment: this._vue.comment + '電源オン',
          code: onCode,
          group:this._vue.name
        };
      }
    }

    this._vue.channelTable.comment = this._vue.comment;
    
    this._common.remocon.remoconGroup[this._vue.name] = {
      type: 'tv',
      comment: this._vue.comment,
      UHF: {label:'地デジ'},
      BS: {label:'BS'},
      CS: {label:'CS'},
    };
    for(let net of ['UHF', 'BS', 'CS']) {
      this._common.remocon.remoconGroup[this._vue.name][net].display = this._vue.channelTable[net].display;
      for(let i = 1; i <= 12; i++) {
        this._common.remocon.remoconGroup[this._vue.name][net][i] = {
          display: this._vue.channelTable[net][i].display,
          label: this._vue.channelTable[net][i].label,
        };
      }
    }
    this._common.Trigger(this._common.events.changeRemocon, this);
    this._vue.sequence = 0;
    this._vue.name = '';
    this._vue.comment = '';
  }
}

module.exports = RemoconTV;
