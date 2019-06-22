<template>
  <ElContainer @click.native="ClearSelect">
    <ElAside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>リモコン設定</h4>
      <div class="well no-mobile">
        <ElRow>
          <h5>リモコンコード</h5>
        </ElRow>
        <a id="remocon-save" style="display:none" href="/remocon/gecko_remocon.json" />
        <ElButton @click="Save" type="primary" class="system-config-btn">
          ファイルに保存
        </ElButton>

        <input @change="LoadFile" id="remocon-load" type="file" accept="text/json" style="display:none">
        <ElTooltip placement="right" content="同じ登録名のコードは上書きされます" effect="light" open-delay="500">
          <ElButton @click="Load" type="primary" class="system-config-btn">
            ファイルから追加
          </ElButton>
        </ElTooltip>
      </div>
    </ElAside>

    <ElMain>
      <div v-if="receivedCode" class="well-transparent">
        <h5>受信したリモコンコード</h5>
        <br>
        <ElTooltip placement="top" content="clickすることで選択されます" effect="light" open-delay="500">
          <table class="table table-striped">
            <thead>
              <tr>
                <th width="16%">
                  モジュール
                </th>
                <th width="16%">
                  フォーマット
                </th>
                <th width="60%">
                  コード
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item of lastRemoconCode" :key="'r-lastRemoconCode' + item.deviceName" :class="{success:(selectedItem&&(item==selectedItem))}" @click="SelectRemocon(item)">
                <td>{{ item.deviceName }}</td>
                <td>{{ item.format }}</td>
                <td>{{ item.info }}</td>
              </tr>
            </tbody>
          </table>
        </ElTooltip>
        <div v-if="selectedItem == null">
          <h5>登録するリモコンコードを選択して下さい。</h5>
        </div>
      </div>
      <div v-else>
        <h5>リモコンコードを追加する場合は、親機に向けてリモコンを送信してください。</h5>
      </div>

      <div v-if="selectedItem != null" class="well-transparent">
        <ElForm :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
          <ElRow>
            <ElTooltip placement="top" content="種類＋メーカー名＋シリーズ名＋機能名など、判別しやすい名前" effect="light" open-delay="500">
              <ElFormItem label="登録名" prop="name">
                <ElInput type="text" v-model="ruleForm.name" />
                <div v-if="nameAlert" class="form_item_error">
                  登録名が既に存在しています。上書きしますがよろしいですか？
                </div>
              </ElFormItem>
            </ElTooltip>
          </ElRow>
          <ElRow>
            <ElTooltip placement="top" content="UIなどで表示される名称" effect="light" open-delay="500">
              <ElFormItem label="コメント" prop="comment">
                <ElInput type="text" v-model="ruleForm.comment" />
              </ElFormItem>
            </ElTooltip>
          </ElRow>
          <ElRow>
            <ElCol span="3" offset="16">
              <ElButton @click="Cancel" type="danger">
                中止
              </ElButton>
            </ElCol>
            <ElCol span="3" offset="1">
              <ElButton @click="Submit" :disabled="!rulesValid" type="primary">
                保存
              </ElButton>
            </ElCol>
          </ElRow>
        </ElForm>
      </div>

      <div v-if="remocon.remoconTable && (Object.keys(remocon.remoconTable).length > 0)" class="well-transparent">
        <h5>登録済みリモコン一覧</h5>
        <table class="table">
          <thead>
            <tr>
              <th width="40%">
                登録名<br>コメント
              </th>
              <th class="60%">
                コード
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item,idx) of singleRemoconTable" :key="'r-remoconTable' + idx" @click.stop="SelectItem(idx)" :class="{success:IsSelect(item,idx)}">
              <ElTooltip placement="top" content="リモコンコードを送信するには左端のボタンを押してください" effect="light" open-delay="500">
                <td width="40%">
                  <ElButton type="default" icon="el-icon-d-arrow-right" class="remocon-btn pull-left" @click.stop="IRSend(item, idx)" />
                  <div>
                    {{ idx }}<br>
                    {{ item.comment }}
                  </div>
                </td>
              </ElTooltip>
              <ElTooltip placement="top" content="リモコンコードを削除するには選択して右端の赤いボタンを押してください" effect="light" open-delay="500">
                <td width="60%">
                  <ElCol span="20">
                    {{ Decode(item.code) }}
                  </ElCol>
                  <ElCol span="4">
                    <ElButton v-show="(idx===selectedIdx)" type="danger" icon="el-icon-delete" class="remocon-btn pull-right" @click="DeleteItem(item, idx)" />
                  </ElCol>
                </td>
              </ElTooltip>
            </tr>
          </tbody>
        </table>
        <table class="table" v-for="(group, groupName) of remocon.remoconGroup" :key="'r-remoconGroup' + groupName">
          <tbody>
            <ElTooltip placement="top" content="リモコンコードを削除するには選択して右端の赤いボタンを押してください" effect="light" open-delay="500">
              <tr @click.stop="SelectGroup(groupName)" :class="{success:(groupName==selectedGroup)}">
                <td width="40%">
                  <div>
                    {{ groupName }}<br>{{ group.comment }}
                  </div>
                </td>
                <td width="60%">
                  <ElTooltip placement="top" content="グループ登録されているコード(エアコン設定・TV設定で登録したコード)はまとめて消去されます" effect="light" open-delay="500">
                    <ElButton v-show="(selectedGroup==groupName)" type="danger" icon="el-icon-delete" class="remocon-btn pull-right" @click="DeleteGroup(groupName)" />
                  </ElTooltip>
                </td>
              </tr>
            </ElTooltip>
            <!-- eslint-disable-next-line vue/no-use-v-if-with-v-for -->
            <tr v-for="(item,idx) of remocon.remoconTable" :key="'r-remoconTable' + idx" v-if="(item.group==selectedGroup)&&(item.group==groupName)">
              <ElTooltip placement="top" content="リモコンコードを送信するには左端のボタンを押してください" effect="light" open-delay="500">
                <td width="40%">
                  <ElButton type="default" icon="el-icon-d-arrow-right" class="remocon-btn pull-left" @click.stop="IRSend(item, idx)" />
                  <div>
                    {{ idx }}<br>
                    {{ item.comment }}
                  </div>
                </td>
              </ElTooltip>
              <ElTooltip placement="top" content="グループ登録されているコード(エアコン設定・TV設定で登録したコード)は個別に消去できません" effect="light" open-delay="500">
                <td width="60%">
                  <ElCol span="22">
                    {{ Decode(item.code) }}
                  </ElCol>
                </td>
              </ElTooltip>
            </tr>
          </tbody>
        </table>
      </div>
    </ElMain>
  </ElContainer>
</template>

<script>
  import { Tooltip, Form, FormItem, Input } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
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
        lastRemoconCode: {},
        nameAlert: false,
        selectedGroup: null,
        selectedItem: null,
        selectedIdx: null,
        ruleForm: {
          name: '',
          comment: '',
        },
        rules: {
          name: [
            { required: true, min: 4, message: '登録名を4文字以上で入れてください。', trigger: 'blur' },
            { validator: this.ValidateName.bind(this), trigger: 'blur' },
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
    },
    computed: {
      receivedCode() {
        return Object.keys(this.lastRemoconCode).length > 0;
      },
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
      },
      singleRemoconTable() {
        const remoconTable = {};
        for(const item in this.remocon.remoconTable) {
          if(!this.remocon.remoconTable[item].group||this.remocon.remoconTable[item].group==='')
            remoconTable[item] = this.remocon.remoconTable[item];
        }
        return remoconTable;
      },
    },
    mounted() {
      this.reader = new FileReader();

      Socket.on('events', (msg) => {
        if(msg.type !== 'irreceive') return;
        const code = Common.RemoconSearch(msg.data[0].code);
        const data = {
          name: msg.data[0].name,
          code: msg.data[0].code,
          deviceName: msg.data[0].deviceName,
          format: msg.data[0].format,
          info: code.name ? (code.name + ' ' + code.comment) : code.code,
        };
        this.$set(this.lastRemoconCode, data.deviceName, data);
        this.selectedItem = null;
      });
      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });

      this.remoconLoad = document.getElementById('remocon-load');
      this.remoconSave = document.getElementById('remocon-save');
    },
    methods: {
      Save() {
        const dt = new Date();
        this.remoconSave.href = this.remoconSave.origin +
          '/remocon/gecko_remocon_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.json.gz';
        this.remoconSave.click();
      },
      Load() {
        this.remoconLoad.value = '';
        this.remoconLoad.click();
      },
      LoadFile() {
        this.reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('addRemocon', this.reader.result);
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this.reader.readAsArrayBuffer(this.remoconLoad.files[0]);
      },
      Decode(code) {
        return Common.RemoconSearch(code).code;
      },
      SelectRemocon(item) {
        this.selectedItem = item;
        this.ruleForm.name = item.name;
        this.ruleForm.comment = item.comment;
      },
      ValidateName(rule, value, callback) {
        this.nameAlert = false;
        if(this.remocon.remoconTable[value]) {
          if(this.remocon.remoconTable[value].group) {
            return callback(new Error('エアコン・テレビのコード名と同じ名前は登録できません。'));
          }
          this.nameAlert = true;
        }
        return callback();
      },
      Cancel() {
        Common.emit('toastr_clear', this);
        this.selectedItem = null;
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      Submit() {
        this.$refs.ruleForm.validate((valid) => {
          if(!valid) return;
          this.nameAlert = false;
          this.remocon.remoconTable[this.ruleForm.name] = {
            comment: this.ruleForm.comment,
             code: this.selectedItem.code,
          };
          Common.emit('changeRemocon', this);
          this.selectedItem = null;
        });
      },
      DeleteItem(item, idx) {
        this.selectedGroup = null;
        this.selectedIdx = null;
        delete this.remocon.remoconTable[idx];
        Common.emit('changeRemocon', this);
      },
      DeleteGroup(group) {
        this.selectedGroup = null;
        this.selectedIdx = null;
        for(const i in this.remocon.remoconTable) {
          if(this.remocon.remoconTable[i].group === group) {
            delete this.remocon.remoconTable[i];
          }
        }
        delete this.remocon.remoconGroup[group];
        Common.emit('changeRemocon', this);
      },
      IsSelect(item, idx) {
        if(!this.selectedIdx) return false;
        if(idx === this.selectedIdx) return true;
        if(!item.group || (item.group === '')) return false;
        if(!this.remocon.remoconTable[this.selectedIdx]) {
          this.selectedIdx = null;
          return false;
        }
        if(item.group !== this.remocon.remoconTable[this.selectedIdx].group) return false;
        return true;
      },
      IRSend(item, idx) {
        const code = this.remocon.remoconTable[idx].code;
        let cmd = 'ir 01';
        for(let i = 0; i < code.length; i++) {
          cmd += ' ' + ('00' + code[i].toString(16)).slice(-2);
        }
        Socket.emit('command', {
          type: 'command',
          device: 'server',
          command: cmd,
        });
      },
      SelectItem(idx) {
        this.selectedIdx = idx;
        this.selectedGroup = null;
      },
      SelectGroup(idx) {
        this.selectedIdx = null;
        this.selectedGroup = idx;
      },
      ClearSelect() {
        this.selectedIdx = null;
        this.selectedGroup = null;
      },
    },
  };
</script>

<style scoped>
  .system-config-btn {
    width: 70%;
    margin: 1vh;
  }

  .table {
      font-family: Courier, 'NotoSansMonoCJKjp', monospace;
  }

  .table td .remocon-btn {
    line-height: 20px;
    vertical-align: middle;
    margin: 6px 6px;
  }
</style>


