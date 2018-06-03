<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-4 col-md-4 scrollable">
      <br>
      <h4>エアコン設定</h4>
      <div class="well well-transparent">
        <div class="row">
          <div class="col-md-4">
            <h5>登録名</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" :class="{error:!nameValid}" type="text" v-model="name" @input="NameCheck">
          </div>
        </div>
        <div class="row">
          <div class="col-md-offset-2">
            <h6>識別しやすい名前を付けてください。</h6>
            <h6 v-if="nameAlert.length" class="error">{{ nameAlert }}</h6>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <h5>コメント</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" :class="{error:!commentValid}" type="text" v-model="comment" @input="CommentCheck">
          </div>
        </div>
        <div class="row" v-if="commentAlert.length">
          <div class="col-md-offset-2">
            <h6 class="error">{{ commentAlert }}</h6>
          </div>
        </div>
        <br>
        <div class="row">
          <alert :type="(sequence==0)?'success':'default'">
            <strong>事前準備</strong><br>
            風向、風量等の設定は固定になるので<br>
            開始前に最適な状態にしてください。
          </alert>
          <alert :type="(sequence!=0)&&(sequence!=40)&&(mode=='heater')?'success':'default'">
            1.暖房の各温度のリモコンを学習します。
          </alert>
          <alert :type="(sequence!=0)&&(sequence!=40)&&(mode=='cooler')?'success':'default'">
            2.冷房の各温度のリモコンを学習します。
          </alert>
          <alert :type="(sequence!=0)&&(sequence!=40)&&(mode=='power')?'success':'default'">
            3.電源(Off)のリモコンを学習します。
          </alert>
          <alert :type="(sequence==40)?'success':'default'">
            4.登録をします。
          </alert>
        </div>
        <br>
        <div class="row">
          <div class="col-md-offset-4">
            <button v-show="sequence==0" :disabled="!nameValid || !commentValid" class="btn btn-primary btn-sm btn-margin" @click="Start">開始</button>
            <button v-show="sequence!=0" class="btn btn-danger btn-sm btn-margin" @click="Stop">中止</button>
            <button v-show="sequence==40" class="btn btn-primary btn-sm btn-margin" @click="Submit">保存</button>
          </div>
        </div>

      </div>
    </div>

    <div class="col-sm-7 col-md-7">
      <div v-show="sequence!=0" class="row well well-transparent">
        <h4>{{ modeLabel[mode] }}</h4>
      </div>
      <div class="well well-transparent">
        <div class="row">
          <div v-show="lowTempShow">
            <div class="col-md-4">
              <h5>最低温度</h5>
              <form class="btn-inline">
                <select class="form-control ui-select-menu" v-model="lowTemp[mode]" @change="LowTemp">
                  <option/>
                  <option v-for="temp in 9" :key="'ra-lowTemp' + temp" :value="temp+11">{{ temp+11 }}°C</option>
                </select>
              </form>
            </div>
            <div class="col-md-4">
              <h5>温度間隔</h5>
              <form class="btn-inline">
                <select class="form-control ui-select-menu" v-model="tempStep[mode]" @change="TempStep">
                  <option/>
                  <option v-for="temp in 2" :key="'ra-lowTempStep' + temp" :value="temp*0.5">{{ temp*0.5 }}°C</option>
                </select>
              </form>
            </div>
          </div>
          <div v-show="highTempShow">
            <div class="col-md-4">
              <h5>最高温度</h5>
              <form class="btn-inline">
                <select class="form-control ui-select-menu" v-model="highTemp[mode]" @change="HighTemp">
                  <option/>
                  <option v-for="temp in 9" :key="'ra-highTemp' + temp" :value="temp+25">{{ temp+25 }}°C</option>
                </select>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div id="airconTable" class="well well-transparent scrollable" v-show="tableShow">
        <table class="table table-striped remocon-table">
          <thead>
            <tr>
              <th class="col-md-2">温度</th>
              <th class="col-md-9">コード</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item,idx) of remoconTable[mode]" :key="'ra-remoconTable' + idx" :class="[{'remocon-error':!CodeValid(idx)}, {success: (lastPtr==idx)}]">
              <td>{{ (!lowTemp[mode]||(lowTemp[mode]==0))?'':((idx*tempStep[mode]+lowTemp[mode]) + '°C') }}</td>
              <td>{{ item?item.info:'' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script>
  import { alert } from 'vue-strap';

  export default {
    components: {
      alert,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
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
        mode: 'heater',
        modeLabel: { heater: '暖房モード', cooler: '冷房モード', power: '' },
        lowTemp: { cooler: 0, heater: 0, power: 0 },
        highTemp: { cooler: 0, heater: 0, power: 0 },
        tempStep: { cooler: 1, heater: 1, power: 0 },
        remoconTable: { cooler: [], heater: [], power: [] },
        codeLength: -1,
        lastPtr: 0,
        tempPtr: 0,
      };
    },
    computed: {
      lowTempShow() {
        return (parseInt(this.lowTemp[this.mode]) !== 0) ||
               ((this.sequence <= 10) && (this.sequence >= 3)) ||
              ((this.sequence <= 30) && (this.sequence >= 23));
      },
      highTempShow() {
        return (parseInt(this.highTemp[this.mode]) !== 0) ||
               ((this.sequence <= 10) && (this.sequence >= 6)) ||
               ((this.sequence <= 30) && (this.sequence >= 26));
      },
      tableShow() {
        return ((this.sequence >= 2) && (this.sequence <= 29));
      },

    },
    mounted() {
      this.lastRemoconCode = null;
      this.lastCode = null;
      this.dataLength = {};
      this.table = document.getElementById('airconTable');

      Socket.on('events', (msg) => {
        if(msg.type !== 'irreceive') return;
        if(msg.data[0].deviceName !== 'server') return;
        if(this.sequence < 1) return;

        const code = Common.RemoconSearch(msg.data[0].code);
        this.lastRemoconCode = {
          name: code.name,
          code: msg.data[0].code,
          format: msg.data[0].format,
          info: code.name ? (code.name + ' ' + code.comment) : code.code,
        };

        this.dataLength[this.lastRemoconCode.code.length] = (this.dataLength[this.lastRemoconCode.code.length] || 0) + 1;
        let l = 0;
        let m = -1;
        for(const i in this.dataLength) {
          if(this.dataLength[i] > m) {
            m = this.dataLength[i];
            l = i;
          }
        }
        this.codeLength = l;

        this.ExecSequence(this.lastRemoconCode.info);
        this.lastCode = this.lastRemoconCode.info;
      });
      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });
    },
    methods: {
      NameCheck() {
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
        Common.emit('toastr_clear', this);
        this.sequence = 1;
        this.remoconTable = { cooler: [], heater: [], power: [] };
        this.nameAlert = '';
        this.lastCode = null;
        this.ExecSequence();
      },
      Stop() {
        Common.emit('toastr_clear', this);
        this.sequence = 0;
        this.lowTemp = { cooler: 0, heater: 0, power: 0 };
        this.highTemp = { cooler: 0, heater: 0, power: 0 };
        this.ExecSequence();
      },
      Submit() {
        if(!this.nameValid || !this.commentValid) return;

        const mode = [
          { label: 'heater', color: '#d93625' },
          { label: 'cooler', color: '#2586d9' },
        ];
        const group = { type: 'aircon', comment: this.comment };
        for(const m of mode) {
          const size = (this.highTemp[m.label] - this.lowTemp[m.label]) / this.tempStep[m.label] + 1;
          for(let i = 0; i < size; i++) {
            const data = this.remoconTable[m.label][i];
            const temp = this.lowTemp[m.label] + i * this.tempStep[m.label];
            this.$set(this.remocon.remoconTable, this.name + '_' + m.label + temp, {
              comment: this.comment + m.label + temp,
              code: data.code,
              group: this.name,
            });
          }
          group[m.label] = { color: m.color, min: this.lowTemp[m.label], max: this.highTemp[m.label], step: this.tempStep[m.label] };
        }
        let l = this.remoconTable['power'].length - 2;
        if(l < 0) l = 0;
        this.$set(this.remocon.remoconTable, this.name + '_off', { comment: this.comment + 'off', code: this.remoconTable['power'][l].code, group: this.name });
        this.$set(this.remocon.remoconGroup, this.name, group);
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.name = '';
        this.comment = '';
        Common.emit('toastr_success', this, '登録完了しました。');
      },
      LowTemp() {
        if(!this.lowTemp[this.mode] || (this.lowTemp[this.mode] === '')) return;
        if((this.sequence === 2) || (this.sequence === 22)) this.sequence++;
        this.ExecSequence();
      },
      TempStep() {
      },
      HighTemp() {
        if(!this.highTemp[this.mode] || (this.highTemp[this.mode] === '')) return;
        if((this.sequence === 6) || (this.sequence === 26)) this.sequence++;
        this.ExecSequence();
      },
      CodeValid(idx) {
        if(!this.remoconTable[this.mode][idx] || !this.remoconTable[this.mode][idx].code) return false;
        if(this.remoconTable[this.mode][idx].code.length !== parseInt(this.codeLength)) return false;
        for(const i in this.remoconTable[this.mode]) {
          const data = this.remoconTable[this.mode][i];
          if(!data || !data.info) continue;
          if(parseInt(idx) === parseInt(i)) continue;
          if(this.remoconTable[this.mode][idx].info === data.info) return false;
        }
        return true;
      },
      CodeCheck() {
        const size = (this.highTemp[this.mode] - this.lowTemp[this.mode]) / this.tempStep[this.mode] + 1;
        if(size < 0) return false;
        for(let i = 0; i < size; i++) {
          if(!this.CodeValid(i)) return false;
        }
        return true;
      },
      ExecSequence(codeComment) {
        let reentry;
        do {
          reentry = false;
          switch (this.sequence) {
            case 1:
              this.dataLength = {};
              // fallthrough
            case 21:
              if(this.sequence === 1) {
                Common.emit('toastr_info', this, '最初に暖房モードの設定をします。<br><strong>暖房モード</strong>に設定後、リモコンを本機に向けて温度を<strong>下げる</strong>ボタンを押して下さい。');
                this.mode = 'heater';
              } else if(this.sequence === 21) {
                Common.emit('toastr_success', this, '暖房は完了です。<br>次に冷房モードの設定をします。<br><strong>冷房モード</strong>に設定後、リモコンを本機に向けて温度を<strong>下げる</strong>ボタンを押して下さい。');
                this.mode = 'cooler';
              }
              this.lowTemp[this.mode] = 0;
              this.tempStep[this.mode] = 1;
              this.highTemp[this.mode] = 0;
              this.sequence++;
              break;
            case 2:
            case 22:
              if(codeComment !== this.lastCode) {
                Common.emit('toastr_info', this, '続けて温度を<strong>下げる</strong>ボタンを押して下さい。');
                this.lastPtr = 0;
                this.remoconTable[this.mode].unshift(this.lastRemoconCode);
                break;
              }
              this.sequence++;
              reentry = true;
              break;
            case 3:
            case 23:
              if(!this.lowTemp[this.mode] || (parseInt(this.lowTemp[this.mode]) === 0)) {
                Common.emit('toastr_info', this, '最低温度は何度になりましたか？<br>右側の<strong>最低温度</strong>と<strong>温度間隔</strong>を選んで下さい。');
                break;
              }
              reentry = true;
              this.sequence++;
              break;
            case 4:
            case 24:
              this.tempPtr = 1;
              Common.emit('toastr_info', this, '今度は温度を<strong>上げる</strong>ボタンを押して下さい。');
              this.sequence++;
              break;
            case 5:
            case 25:
              if(codeComment !== this.lastCode) {
                if(this.remoconTable[this.mode].length <= this.tempPtr) {
                  this.remoconTable[this.mode].push(this.lastRemoconCode);
                } else if(!this.remoconTable[this.mode][this.tempPtr] || (codeComment !== this.remoconTable[this.mode][this.tempPtr].comment)) {
                  if(this.lastRemoconCode.code.length === parseInt(this.codeLength)) {
                    this.remoconTable[this.mode].splice(this.tempPtr, 1, this.lastRemoconCode);
                  }
                }
                this.lastPtr = this.tempPtr;
                this.tempPtr++;
                Common.emit('toastr_info', this, '続けて温度を<strong>上げる</strong>ボタンを押して下さい。');
                break;
              }
              this.sequence++;
              reentry = true;
              break;
            case 6:
            case 26:
              if(!this.highTemp[this.mode] || (parseInt(this.highTemp[this.mode]) === 0)) {
                Common.emit('toastr_info', this, '最高温度は何度になりましたか？<br>右側の<strong>最高温度</strong>を選んで下さい。');
                break;
              }
              reentry = true;
              this.sequence++;
              break;
            case 7:
            case 27:
              if((this.tempPtr - 1 === (this.highTemp[this.mode] - this.lowTemp[this.mode]) / this.tempStep[this.mode]) && this.CodeCheck()) {
                reentry = true;
                this.sequence += 3;
                break;
              }
              Common.emit('toastr_error', this, '途中でエラーが出ているので、<br>今度は温度を<strong>下げる</strong>ボタンを押して下さい。<br>反応をみてゆっくりと押して下さい。');
              this.tempPtr = (this.highTemp[this.mode] - this.lowTemp[this.mode]) / this.tempStep[this.mode] - 1;
              if(this.tempPtr < 0) this.tempPtr = 1;
              if(this.lastPtr !== this.tempPtr + 1) {
                this.remoconTable[this.mode].length = this.tempPtr + 2;

                this.remoconTable[this.mode].splice(this.tempPtr + 1, 1, this.remoconTable[this.mode][this.lastPtr]);
                this.lastPtr = this.tempPtr + 1;
              }
              this.table.scrollTop = this.table.scrollHeight;
              if(codeComment === this.lastCode) break;
              this.sequence++;
              if(codeComment) reentry = true;
              break;
            case 8:
            case 28:
              if(codeComment !== this.lastCode) {
                if(!this.remoconTable[this.mode][this.tempPtr] || (codeComment !== this.remoconTable[this.mode][this.tempPtr].comment)) {
                  if(this.lastRemoconCode.code.length === parseInt(this.codeLength)) {
                    this.remoconTable[this.mode].splice(this.tempPtr, 1, this.lastRemoconCode);
                  }
                }
                this.lastPtr = this.tempPtr;
                this.tempPtr--;
                if(this.tempPtr < 0) this.tempPtr = 0;
                Common.emit('toastr_info', this, '続けて温度を<strong>下げる</strong>ボタンを押して下さい。');
                break;
              }
              if((this.tempPtr === 0) && this.CodeCheck()) {
                reentry = true;
                this.sequence += 2;
                break;
              }
              this.sequence++;
              // fallthrough
            case 9:
            case 29:
              Common.emit('toastr_error', this, '途中でエラーが出ているので、<br>今度は温度を<strong>上げる</strong>ボタンを押して下さい。');
              this.tempPtr = 1;
              if(this.lastPtr !== 0) {
                this.remoconTable[this.mode].splice(0, 1, this.remoconTable[this.mode][this.lastPtr]);
                this.lastPtr = 0;
              }
              if(codeComment === this.lastCode) break;
              this.sequence -= 4;
              if(codeComment) reentry = true;
              break;
            case 10:
              reentry = true;
              this.sequence = 21;
              break;
            case 30:
              Common.emit('toastr_success', this, '冷房は完了です。<br>最後に電源ボタンの登録をします。<br>リモコンを本機に向けて、<strong>電源(Off)ボタン</strong>を押して下さい。');
              this.mode = 'power';
              this.sequence++;
              break;
            case 31:
              Common.emit('toastr_info', this, 'リモコンの表示が電源off状態なのを確認して、<br><strong>電源(on)</strong>ボタンを押して下さい。');
              this.remoconTable[this.mode].push(this.lastRemoconCode);
              this.sequence++;
              break;
            case 32:
              Common.emit('toastr_info', this, 'リモコンの表示が電源on状態なのを確認して、<br><strong>電源(off)</strong>ボタンを押して下さい。');
              this.remoconTable[this.mode].push(this.lastRemoconCode);
              {
                const l = this.remoconTable[this.mode].length;
                if((l > 3) &&
                   (this.remoconTable[this.mode][l - 1].info === this.remoconTable[this.mode][l - 3].info)) {
                  this.sequence = 40;
                  reentry = true;
                  break;
                }
              }
              this.sequence--;
              break;
            case 40:
              Common.emit('toastr_success', this, '全て完了です。<br>保存ボタンを押して保存して下さい。');
              break;
            default:
          }
          if(this.table.scrollHeight !== this.table.clientHeight) {
            this.$nextTick(() => {
              const lineHeight = (this.table.scrollHeight - 23) / this.remoconTable[this.mode].length;
              const linePos = lineHeight * this.lastPtr + 23;
              if(linePos - this.table.scrollTop > this.table.clientHeight - lineHeight - 30) {
                this.table.scrollTop = linePos - (this.table.clientHeight - lineHeight - 30);
              }
              if(linePos - this.table.scrollTop < 30) {
                this.table.scrollTop = linePos - 30;
              }
              if(this.lastPtr === 0) this.table.scrollTop = 0;
            });
          }
        } while(reentry);
      },
    },
  };
</script>

<style scoped>
  #airconTable {
    height: calc(100vh - 80px - 80px);
    position: fixed;
  }

  .ui-func-name {
    width:100%;
  }

  .btn-inline {
    display:inline-block;
    margin-left: 0.2vw;
  }

  .btn-margin {
    margin-right:0.2vw;
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

  .ui-select-menu {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:12px;
    margin: 0px;
    padding:0px;
    text-align: center;
    width: 100%;
    height:20px;
    line-height:20px;
    background-color: rgba(255,255, 255, 0);
  }
</style>

