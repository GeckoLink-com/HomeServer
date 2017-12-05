<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-4 col-md-4 scrollable">
      <br>
      <h4>ＴＶ設定</h4>
      <div class="well well-transparent">
        <br>
        <div class="row">
          <div class="col-md-4">
            <h5>登録名</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" :class="{error:!nameValid}" type="text" v-model="name" @input="NameCheck"/>
          </div>
        </div>
        <div class="row">
          <div class="col-md-offset-2">
            <h6>識別しやすい名前を付けてください。</h6>
            <h6 v-if="nameAlert.length" class="error">{{nameAlert}}</h6>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <h5>コメント</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" :class="{error:!commentValid}" type="text" v-model="comment" @input="CommentCheck"/>
          </div>
        </div>
        <div class="row" v-if="commentAlert.length">
          <div class="col-md-offset-2">
            <h6 class="error">{{commentAlert}}</h6>
          </div>
        </div>
        <br>
        <div class="row">
          <div class="col-md-offset-1">
            <alert :type="(sequence>0)&&(sequence<4)?'success':'default'">
              1.TVのリモコンを学習します。
            </alert>
            <alert :type="(sequence==4)?'success':'default'">
              2.選局番号と放送局名の対応表を設定し登録します。
            </alert>
          </div>
        </div>
        <br>
        <div class="row">
          <div class="col-md-offset-3">
            <button v-show="sequence==0" :disabled="!nameValid||!commentValid" class="btn btn-primary btn-sm btn-margin" @click="Start">開始</button>
            <button v-show="sequence>0" class="btn btn-danger btn-sm btn-margin" @click="Stop">中止</button>
            <button v-show="existName && (sequence==0)" class="btn btn-primary btn-sm btn-margin" @click="Modify">チャンネル修正</button>
            <button :disabled="sequence!=4" class="btn btn-primary btn-sm btn-margin" @click="Submit">保存</button>
          </div>
        </div>

      </div>
    </div>

    <div class="col-sm-7 col-md-7 scrollable">
      <div v-show="(sequence>0) && (sequence < 4)" class="well well-transparent">
        <table class="table table-striped remocon-table">
          <thead>
            <tr>
              <th class="col-md-2">ボタン</th>
              <th class="col-md-9">コード</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) of remoconTable" :class="[{'remocon-error':!CodeValid(idx)}, {success: (lastPtr==idx)}]">
              <td>{{item.label}}</td>
              <td>{{item.info}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="sequence==4" class="well well-transparent">
        <table class="table table-striped">
          <thead>
            <tr>
              <th class="col-md-2">ボタン</th>
              <th class="col-md-3" v-for="net of ['UHF','BS','CS']">
                <input type="checkbox" v-model="channelTable[net].display" :data-net="net"/>
                {{channelTable[net].label}}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch of 12">
              <td>{{ch}}</td>
              <td v-for="net of ['UHF', 'BS', 'CS']">
                <fieldset :disabled="!channelTable[net].display">
                  <input type="checkbox" v-model="channelTable[net][ch].display"/>
                  <input class="channelList" type="text" v-model="channelTable[net][ch].label"/>
                </fieldset>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script>
  import VueStrap from 'vue-strap';

  export default {
    props: {
      display: false,
    },
    data() {
      return {
        remocon: {
          remoconTable: {},
          remoconGroup: {},
          remoconMacro: {},
        },
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
        remoconFunc: [
          { name: 'power', label: '電源' },
          { name: 'UHF', label: '地デジ' },
          { name: 'BS', label: 'BS' },
          { name: 'CS', label: 'CS' },
          { name: '1', label: '1' },
          { name: '2', label: '2' },
          { name: '3', label: '3' },
          { name: '4', label: '4' },
          { name: '5', label: '5' },
          { name: '6', label: '6' },
          { name: '7', label: '7' },
          { name: '8', label: '8' },
          { name: '9', label: '9' },
          { name: '10', label: '10' },
          { name: '11', label: '11' },
          { name: '12', label: '12' },
          { name: 'vol+', label: '音量＋' },
          { name: 'vol-', label: '音量-' },
        ],
        channelTable: {
          type: 'tv',
          UHF: {
            label: '地デジ',
            display: true,
            '1': { display: true, label: 'NHK-G' },
            '2': { display: true, label: 'NHK-E' },
            '3': { display: true, label: 'TVK' },
            '4': { display: true, label: '日テレ' },
            '5': { display: true, label: 'テレビ朝日' },
            '6': { display: true, label: 'TBS' },
            '7': { display: true, label: 'テレビ東京' },
            '8': { display: true, label: 'フジテレビ' },
            '9': { display: true, label: 'TOKYO MX' },
            '10': { display: false, label: '地デジ10' },
            '11': { display: false, label: '地デジ11' },
            '12': { display: true, label: '放送大学' },
          },
          BS: {
            label: 'BS',
            display: true,
            '1': { display: true, label: 'NHK BS-1' },
            '2': { display: true, label: 'NHK BS-2' },
            '3': { display: true, label: 'NHK BS-hi' },
            '4': { display: true, label: 'BS日テレ' },
            '5': { display: true, label: 'BS朝日' },
            '6': { display: true, label: 'BS-TBS' },
            '7': { display: true, label: 'BSジャパン' },
            '8': { display: true, label: 'BSフジ' },
            '9': { display: true, label: 'WOWOW' },
            '10': { display: true, label: 'STAR' },
            '11': { display: true, label: 'BS11' },
            '12': { display: true, label: 'TwellV' },
          },
          CS: {
            label: 'CS',
            display: true,
            '1': { display: true, label: 'CS1' },
            '2': { display: true, label: 'CS2' },
            '3': { display: true, label: 'CS3' },
            '4': { display: true, label: 'CS4' },
            '5': { display: true, label: 'CS5' },
            '6': { display: true, label: 'CS6' },
            '7': { display: true, label: 'CS7' },
            '8': { display: true, label: 'CS8' },
            '9': { display: true, label: 'CS9' },
            '10': { display: true, label: 'CS10' },
            '11': { display: true, label: 'CS11' },
            '12': { display: true, label: 'CS12' },
          },
        },
      };
    },
    mounted() {
      this._lastRemoconCode = null;
      this._lastCode = null;
      this._dataLength = {};

      Socket.on('events', (msg) => {
        if(msg.type !== 'irreceive') return;
        if(msg.data[0].deviceName !== 'server') return;
        if(this.sequence < 1) return;

        const code = Common.RemoconSearch(msg.data[0].code);
        this._lastRemoconCode = {
          name: code.name,
          code: msg.data[0].code,
          format: msg.data[0].format,
          info: code.name ? (code.name + ' ' + code.comment) : code.code,
        };

        this._dataLength[this._lastRemoconCode.code.length] = (this._dataLength[this._lastRemoconCode.code.length] || 0) + 1;
        let l = 0;
        let m = -1;
        for(const i in this._dataLength) {
          if(this._dataLength[i] > m) {
            m = this._dataLength[i];
            l = i;
          }
        }
        this.codeLength = l;

        this.ExecSequence();
        this._lastCode = this._lastRemoconCode.info;
      });

      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });
    },
    methods: {
      NameCheck() {
        this.existName = false;
        if(this.name.length < 4) {
          this.nameValid = false;
          this.nameAlert = '登録名を4文字以上で入れてください。';
          return;
        }
        if(this.remocon.remoconGroup[this.name]) {
          this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？チャンネル設定を修正する場合、チャンネル修正ボタンを押してください。';
          if(this.remocon.remoconGroup[this.name].type === 'tv') this.existName = true;
        } else {
          this.nameAlert = '';
        }
        this.nameValid = true;
      },
      CommentCheck() {
        if(this.comment.length === 0) {
          this.commentValid = false;
          this.commentAlert = 'コメントを入れてください。';
          return;
        }
        this.commentValid = true;
        this.commentAlert = '';
      },
      Start() {
        this.sequence = 1;
        this.remoconNo = 0;
        this.nameAlert = '';
        this.RemoconInit();
        this.ExecSequence();
      },
      Stop() {
        Common.emit('toastr_clear', this);
        this.sequence = 0;
        this.ExecSequence();
      },
      Modify() {
        Common.emit('toastr_info', this, '右の表の各項目に名称を設定して保存を押して下さい。');
        this.nameAlert = '';
        this.sequence = 4;
        this.RemoconInit();
      },
      Submit() {
        for(let i = 0; i < this.remoconFunc.length; i++) {
          this.$set(this.remocon.remoconTable, this.name + '_' + this.remoconFunc[i].name, {
            comment: this.comment + this.remoconFunc[i].label,
            code: this.remoconTable[i].code,
            group: this.name,
          });
          const code = Common.RemoconSearch(this.remoconTable[i].code);
          if((parseInt(this.remoconTable[i].code[2]) === 3) && (code.code.replace(/ /g, '') === '05150100')) {
            const offCode = [];
            const onCode = [];
            for(let j = 0; j < this.remoconTable[i].code.length; j++) {
              offCode[j] = onCode[j] = this.remoconTable[i].code[j];
            }
            offCode[5] = 0x2f;
            onCode[5] = 0x2e;
            this.$set(this.remocon.remoconTable, this.name + '_off', {
              comment: this.comment + '電源オフ',
              code: offCode,
              group: this.name,
            });
            this.$set(this.remocon.remoconTable, this.name + '_on', {
              comment: this.comment + '電源オン',
              code: onCode,
              group: this.name,
            });
          }
        }

        this.channelTable.comment = this.comment;

        this.$set(this.remocon.remoconGroup, this.name, {
          type: 'tv',
          comment: this.comment,
          UHF: { label: '地デジ' },
          BS: { label: 'BS' },
          CS: { label: 'CS' },
        });
        for(const net of ['UHF', 'BS', 'CS']) {
          this.$set(this.remocon.remoconGroup[this.name][net], 'display', this.channelTable[net].display);
          for(let i = 1; i <= 12; i++) {
            this.$set(this.remocon.remoconGroup[this.name][net], i, {
              display: this.channelTable[net][i].display,
              label: this.channelTable[net][i].label,
            });
          }
        }
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.name = '';
        this.comment = '';
      },
      CodeValid(idx) {
        if(!this.remoconTable[idx] || !this.remoconTable[idx].code) return false;
        if(this.remoconTable[idx].code.length !== parseInt(this.codeLength)) return false;
        for(const i in this.remoconTable) {
          const data = this.remoconTable[i];
          if(!data || !data.info) continue;
          if(parseInt(idx) === parseInt(i)) continue;
          if(this.remoconTable[idx].info === data.info) return false;
        }
        return true;
      },
      RemoconInit() {
        this.remoconTable = [];
        for(let i = 0; i < this.remoconFunc.length; i++) {
          if(this.name + '_' + this.remoconFunc[i].name in this.remocon.remoconTable) {
            const data = this.remocon.remoconTable[this.name + '_' + this.remoconFunc[i].name];
            const code = Common.RemoconSearch(data.code);
            this.remoconTable.push({
              code: data.code,
              group: data.group,
              info: code.name ? (code.name + ' ' + code.comment) : code.code,
              label: this.remoconFunc[i].label,
            });
          } else {
            this.remoconTable.push({
              label: this.remoconFunc[i].label,
            });
          }
        }
        this.remoconNo = 0;
        this.lastPtr = -1;
        if(this.remoconTable[0] && this.remoconTable[0].code) {
          this.codeLength = this.remoconTable[0].code.length;
        }

        if(this.remocon.remoconGroup[this.name] &&
           (this.remocon.remoconGroup[this.name].type === 'tv')) {
          this.channelTable = JSON.parse(JSON.stringify(this.remocon.remoconGroup[this.name]));
        }
      },
      CodeCheck() {
        for(let i = 0; i < this.remoconFunc.length; i++) {
          if(!(i in this.remoconTable) || !('code' in this.remoconTable[i])) return -1;
          if(this.remoconTable[i].code.length !== parseInt(this.codeLength)) return -2;
          for(let j = i + 1; j < this.remoconFunc.length; j++) {
            if(!(j in this.remoconTable) || !('code' in this.remoconTable[j])) return -1;
            if(this.remoconTable[i].info === this.remoconTable[j].info) return -3;
          }
        }
        return 0;
      },
      ExecSequence() {
        let reentry;
        do {
          reentry = false;
          switch (this.sequence) {
            case 1:
              Common.emit('toastr_info', this, 'リモコンの<strong>' + this.remoconFunc[this.remoconNo].label + '</strong>を押してください。');
              this.sequence++;
              break;
            case 2:
              this.remoconTable[this.remoconNo] = this._lastRemoconCode;
              this.remoconTable[this.remoconNo].label = this.remoconFunc[this.remoconNo].label;
              this.lastPtr = this.remoconNo;
              this.remoconNo++;
              if(this.remoconNo !== this.remoconFunc.length) {
                reentry = true;
                this.sequence--;
                break;
              }
              this.sequence++;
              // fallthrough
            case 3:
              {
                const err = this.CodeCheck();
                if(err !== 0) {
                  if(err === -1) Common.emit('toastr_error', this, 'リモコンコードが揃っていません。<br>再度指示に従ってボタンを押して下さい。');
                  if(err === -2) Common.emit('toastr_error', this, 'リモコンコードの読み取りエラーがあります。<br>再度指示に従ってボタンを押して下さい。');
                  if(err === -3) Common.emit('toastr_error', this, 'リモコンコードが重複しています。<br>再度指示に従ってボタンを押して下さい。');
                  this.remoconNo = 0;
                  this.sequence = 1;
                  reentry = true;
                  break;
                }
              }
              Common.emit('toastr_info', this, '次にチャンネル表示設定をします。<br>右の表の各項目に名称を設定して保存を押して下さい。');
              this.sequence++;
              break;
            case 4:
              break;
            default:
          }
        } while(reentry);
      },

    },
    components: {
      alert: VueStrap.alert,
    },
  };
</script>

<style scoped>
  .ui-func-name {
    width:100%;
  }

  .btn-margin {
    margin-right:0.2vw;
  }

  input.channelList {
    width: 85%;
  }

  .remocon-error {
    color: red;
  }

  .remocon-table {
    margin: 0px;
  }

  .remocon-table th, .remocon-table td {
    padding: 1px !important;
    line-height: 20px !important;
    border-top: 1px solid #ddd;
  }

  fieldset:disabled  {
    color: #aaa;
  }
</style>

