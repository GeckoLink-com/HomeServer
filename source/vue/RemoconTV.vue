<template>
  <ElContainer>
    <ElAside width="30%">
      <h4>ＴＶ設定・編集</h4>
      <div class="well well-transparent">
        <ElTooltip placement="right" content="既存のTV設定を選択すると編集できます" effect="light" open-delay="500">
          <ElSelect v-model="selectedRemoconGroup" @change="Select">
            <ElOption label="新規追加" value="newGroup">
              新規追加
            </ElOption>
            <ElOption v-for="(item, index) of remoconTV" :key="'rm-remoconTV' + index" :label="item.name" :value="item.name">
              {{ item.name }}
            </ElOption>
          </ElSelect>
        </ElTooltip>
      </div>
    </ElAside>

    <ElMain v-if="selectedRemoconGroup != null">
      <div class="well well-transparent">
        <ElForm :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
          <ElFormItem label="登録名" prop="name">
            <ElTooltip placement="top" content="識別しやすい名前" effect="light" open-delay="500">
              <ElInput v-model="ruleForm.name" />
            </ElTooltip>
            <div v-if="nameAlert" class="form_item_error">
              登録名が既に存在しています。上書きしますがよろしいですか？
            </div>
          </ElFormItem>

          <ElFormItem label="コメント" prop="comment">
            <ElTooltip placement="top" content="用途などを記述" effect="light" open-delay="500">
              <ElInput v-model="ruleForm.comment" />
            </ElTooltip>
          </ElFormItem>
        </ElForm>
      </div>

      <div v-show="(sequence>0) && (sequence < 4)" class="well well-transparent">
        <table class="table table-striped remocon-table">
          <thead>
            <tr>
              <th width="20%">
                ボタン
              </th>
              <th width="80%">
                コード
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) of remoconTable" :key="'rt-remoconTable' + idx" :class="[{'remocon-error':!CodeValid(idx)}, {success: (remoconNo==idx)}]">
              <td>{{ item.label }}</td>
              <td>{{ item.info }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="sequence==4" class="well well-transparent">
        <table class="table">
          <thead>
            <tr>
              <th width="16%">
                ボタン
              </th>
              <th width="28%" v-for="net of ['UHF','BS','CS']" :key="'rt-netHead' + net">
                <ElCheckbox v-model="channelTable[net].display">
                  {{ channelTable[net].label }}
                </ElCheckbox>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch of 12" :key="'rt-ch' + ch">
              <td>{{ ch }}</td>
              <td v-for="net of ['UHF', 'BS', 'CS']" :key="'rt-netBody' + net">
                <div class="inline-flex">
                  <ElCheckbox v-model="channelTable[net][ch].display" :disabled="!channelTable[net].display" />
                  <ElInput class="channelList" type="text" v-model="channelTable[net][ch].label" :disabled="!channelTable[net].display" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ElRow class="pull-right">
        <ElButton v-show="!existName && (sequence==0)" :disabled="!rulesValid" type="primary" @click="Start">
          開始
        </ElButton>
        <ElButton v-show="sequence>0" type="danger" @click="Stop">
          中止
        </ElButton>
        <ElButton v-show="existName && (sequence==0)" type="primary" @click="Modify">
          チャンネル修正
        </ElButton>
        <ElButton :disabled="sequence!=4" type="primary" @click="Submit">
          保存
        </ElButton>
      </ElRow>
    </ElMain>
  </ElContainer>
</template>

<script>
  import { Tooltip, Select, Option, Form, FormItem, Input, Checkbox } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/checkbox.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElSelect: Select,
      ElOption: Option,
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
      ElCheckbox: Checkbox,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      const data = {
        remocon: {
          remoconTable: {},
          remoconGroup: {},
          remoconMacro: {},
        },
        selectedRemoconGroup: null,
        nameAlert: false,
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
        channelTableDefault: {
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
        ruleForm: {
          name: '',
          comment: '',
        },
        rules: {
          name: [
            { required: true, min: 4, message: '登録名を4文字以上で入れてください。', trigger: [ 'blur', 'change' ]  },
            { validator: this.ValidateName.bind(this), trigger: [ 'blur', 'change' ]  },
          ],
          comment: [
            { required: true, message: 'コメントを入れてください。', trigger: [ 'blur', 'change' ] },
          ],
        },
        ruleValid: {
          name: false,
          comment: false,
        },
      };
      data.channelTable = JSON.parse(JSON.stringify(data.channelTableDefault));
      return data;
    },
    computed: {
      remoconTV() {
        const list = [];
        for(const name in this.remocon.remoconGroup) {
          if(this.remocon.remoconGroup[name].type === 'tv') {
            list.push({
              name: name,
              comment: this.remocon.remoconGroup[name].comment,
            });
          }
        }
        return list;
      },
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
      },
    },
    mounted() {
      this.lastRemoconCode = null;
      this.lastCode = null;
      this.dataLength = {};

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

        this.ExecSequence();
        this.lastCode = this.lastRemoconCode.info;
      });

      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });
    },
    methods: {
      Select(group) {
        if(group === 'newGroup') {
          this.ruleForm.name = '';
          this.ruleForm.comment = '';
          this.existName = false;
        } else {
          this.ruleForm.name = group;
          this.ruleForm.comment = this.remocon.remoconGroup[group].comment;
          this.existName = true;
        }
      },
      ValidateName(rule, value, callback) {
        if(this.remocon && this.remocon.remoconGroup && this.remocon.remoconGroup[value]) {
          this.nameAlert = true;
        } else {
          this.nameAlert = false;
        }
        callback();
      },
      Start() {
        this.sequence = 1;
        this.remoconNo = 0;
        this.nameAlert = false;
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
        this.nameAlert = false;
        this.sequence = 4;
        this.RemoconInit();
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      Submit() {
        for(let i = 0; i < this.remoconFunc.length; i++) {
          this.$set(this.remocon.remoconTable, this.ruleForm.name + '_' + this.remoconFunc[i].name, {
            comment: this.ruleForm.comment + this.remoconFunc[i].label,
            code: this.remoconTable[i].code,
            group: this.ruleForm.name,
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
            this.$set(this.remocon.remoconTable, this.ruleForm.name + '_off', {
              comment: this.ruleForm.comment + '電源オフ',
              code: offCode,
              group: this.ruleForm.name,
            });
            this.$set(this.remocon.remoconTable, this.ruleForm.name + '_on', {
              comment: this.ruleForm.comment + '電源オン',
              code: onCode,
              group: this.ruleForm.name,
            });
          }
        }

        this.channelTable.comment = this.ruleForm.comment;

        this.$set(this.remocon.remoconGroup, this.ruleForm.name, {
          type: 'tv',
          comment: this.ruleForm.comment,
          UHF: { label: '地デジ' },
          BS: { label: 'BS' },
          CS: { label: 'CS' },
        });
        for(const net of ['UHF', 'BS', 'CS']) {
          this.$set(this.remocon.remoconGroup[this.ruleForm.name][net], 'display', this.channelTable[net].display);
          for(let i = 1; i <= 12; i++) {
            this.$set(this.remocon.remoconGroup[this.ruleForm.name][net], i, {
              display: this.channelTable[net][i].display,
              label: this.channelTable[net][i].label,
            });
          }
        }
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.selectedRemoconGroup = null;
        Common.emit('toastr_clear', this);
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
          if(this.ruleForm.name + '_' + this.remoconFunc[i].name in this.remocon.remoconTable) {
            const data = this.remocon.remoconTable[this.ruleForm.name + '_' + this.remoconFunc[i].name];
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

        this.channelTable = JSON.parse(JSON.stringify(this.channelTableDefault));
        if(this.remocon.remoconGroup[this.ruleForm.name] &&
           (this.remocon.remoconGroup[this.ruleForm.name].type === 'tv')) {
          this.channelTable = JSON.parse(JSON.stringify(this.remocon.remoconGroup[this.ruleForm.name]));
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
              if(this.CodeValid(this.remoconNo)) {
                this.remoconNo++;
                if(this.remoconNo === this.remoconFunc.length) this.sequence = 3;
                reentry = true;
                break;
              }
              Common.emit('toastr_info', this, 'リモコンの<strong>' + this.remoconFunc[this.remoconNo].label + '</strong>を押してください。');
              this.sequence++;
              break;
            case 2:
              this.remoconTable[this.remoconNo] = this.lastRemoconCode;
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
  };
</script>

<style scoped>

  input.channelList {
    width: 85%;
  }

  .remocon-error {
    color: red;
  }

  fieldset:disabled  {
    color: #aaa;
  }

  .inline-flex {
    display: flex;
  }
</style>

