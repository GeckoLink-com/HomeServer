<template>
  <el-container>
    <el-aside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>マクロ登録・編集</h4>
      <div class="well well-transparent">
        <el-tooltip placement="right" content="既存のマクロを選択すると編集できます" effect="light" open-delay="500">
          <el-select v-model="selectedMacro" @change="SelectMacro">
            <el-option label="新規追加" value="newMacro">
              新規追加
            </el-option>
            <el-option v-for="(item,index) of remocon.remoconMacro" :key="'rm-remoconMacro' + index" :label="index" :value="index">
              {{ index }}
            </el-option>
          </el-select>
        </el-tooltip>
      </div>
    </el-aside>

    <el-main>
      <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
        <div v-if="selectedMacro != null" class="well well-transparent">
          <el-form-item label="登録名" prop="name">
            <el-tooltip placement="top" content="識別しやすい名前" effect="light" open-delay="500">
              <el-input v-model="ruleForm.name" />
            </el-tooltip>
            <div v-if="nameAlert" class="form_item_error">
              登録名が既に存在しています。上書きしますがよろしいですか？
            </div>
          </el-form-item>
          <el-form-item label="コメント" prop="comment">
            <el-tooltip placement="top" content="用途などを記述" effect="light" open-delay="500">
              <el-input v-model="ruleForm.comment" />
            </el-tooltip>
          </el-form-item>
        </div>

        <div v-if="macro.length > 0" class="well well-transparent">
          <table class="table remocon-table">
            <thead>
              <tr>
                <th width="40%">登録名</th>
                <th width="60%">コメント</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) of macro" :key="'rm-macro' + idx">
                <td v-if="item.wait==null">
                  <el-tooltip placement="top" content="登録済みのリモコンコードに置き換える場合は選択" effect="light" open-delay="500">
                    <el-select v-model="item.label" @change="dirty=true">
                      <el-option v-for="(remocon,idx) of remocon.remoconTable" :key="'rm-remoconTable' + idx" :label="idx" :value="idx">
                        {{ idx }}
                      </el-option>
                    </el-select>
                  </el-tooltip>
                </td>
                <td v-else>
                  <el-tooltip placement="top" content="次のリモコンコードを発行するまでの間隔" effect="light" open-delay="500">
                    <el-input-number min="0.1" step="0.1" precision="1" v-model="item.wait" @change="dirty=true" />
                    秒
                  </el-tooltip>
                </td>
                <td v-if="item.wait == null">
                  {{ item.label && remocon.remoconTable[item.label] ? remocon.remoconTable[item.label].comment : item.info }}
                </td>
                <td v-else>待ち時間</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedMacro != null" class="well well-transparent">
          <el-row class="pull-right">
            <el-button v-if="(selectedMacro === 'newMacro') && (sequence === 0)" type="primary" @click="Start">開始</el-button>
            <el-button v-if="selectedMacro !== 'newMacro'" :disabled="dirty" type="danger" @click="removeDialog = true">削除</el-button>
            <el-dialog title="マクロ登録の削除" :visible.sync="removeDialog" :show-close="false">
              <div v-if="selectedMacro !== 'newMacro'">
                {{ selectedMacro }}を削除します。よろしいですか？
              </div>
              <div v-if="selectedMacro === 'newMacro'" >
                削除しました。
              </div>
              <div slot="footer" class="dialog-footer">
                <el-button type="default" @click="removeDialog = false">中止</el-button>
                <el-button type="primary" @click="Remove" >実行</el-button>
              </div>
            </el-dialog>
            <el-button v-if="(selectedMacro !== 'newMacro')||(sequence !== 0)" :disabled="!dirty" type="danger" @click="Cancel">中止</el-button>
            <el-button v-if="(selectedMacro === 'newMacro')&&(sequence < 2)" type="primary" :disabled="!rulesValid||!dirty||(macro.length === 0)" @click="sequence=2">終了</el-button>
            <el-button v-if="(selectedMacro !== 'newMacro')||(sequence === 2)" type="primary" :disabled="!rulesValid||!dirty||(macro.length === 0)" @click="Submit">保存</el-button>
          </el-row>
        </div>
      </el-form>
    </el-main>
  </el-container>
</template>

<script>
  import { Tooltip, Dialog, Select, Option, Form, FormItem, Input, InputNumber } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/dialog.css';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/input-number.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElDialog: Dialog,
      ElSelect: Select,
      ElOption: Option,
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
      ElInputNumber: InputNumber,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedMacro: null,
        macro: [],
        remocon: {
          remoconTable: {},
          remoconGroup: {},
          remoconMacro: {},
        },
        dirty: false,
        sequence: 0,
        removeDialog: false,
        nameAlert: false,
        ruleForm: {
          name: '',
          comment: '',
        },
        rules: {
          name: [
            { required: true, min: 4, message: '登録名を4文字以上で入れてください。', trigger: 'blur' },
            { validator: this.ValidateName.bind(this), trigger: 'blur' },
            { validator: () => { this.dirty = true; }, trigger: 'change' },
          ],
          comment: [
            { required: true, message: 'コメントを入れてください。', trigger: [ 'blur', 'change'] },
            { validator: () => { this.dirty = true; }, trigger: 'change' },
          ],
        },
        ruleValid: {
          name: true,
          comment: true,
        },
      };
    },
    computed: {
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
      },
    },
    mounted() {
      Socket.on('events', (msg) => {
        if((msg.type !== 'irreceive') || !this) return;
        if(msg.data[0].deviceName !== 'server') return;
        if(this.sequence !== 1) return;

        const remoconCode = msg.data[0].code;
        const code = Common.RemoconSearch(remoconCode);
        const now = new Date();
        if(this.macro.length > 0) {
          let wait = now - this.lastEvent;
          wait = Math.ceil(wait / 100) / 10;
          this.macro.push({
            wait: wait,
          });
        }
        this.macro.push({
          label: code.name,
          code: remoconCode,
          info: code.code,
        });
        this.lastEvent = now;
        this.dirty = true;
      });
      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });
    },
    methods: {
      SelectMacro() {
        if(this.selectedMacro === 'newMacro') {
          this.ruleForm.name = '';
          this.ruleForm.comment = '';
        } else {
          this.ruleForm.name = this.selectedMacro;
          this.ruleForm.comment = this.remocon.remoconMacro[this.ruleForm.name].comment;
        }
        this.Cancel();
      },
      ValidateName(rule, value, callback) {
        if(this.remocon && this.remocon.remoconMacro && this.remocon.remoconMacro[value]) {
          this.nameAlert = true;
        } else {
          this.nameAlert = false;
        }
        callback();
      },
      Start() {
        if(this.sequence !== 0) return;
        this.sequence = 1;
        Common.emit('toastr_info', this, 'リモコンの操作手順を順番に記録します。<br>リモコンのボタンは<strong>長押ししない</strong>で下さい。');
        this.nameAlert = false;
        this.dirty = true;
      },
      Cancel() {
        this.macro = [];
        if(this.selectedMacro !== 'newMacro') {
          for(const item of this.remocon.remoconMacro[this.selectedMacro].macro) {
            const code = Common.RemoconSearch(item.code);
            this.macro.push({
              wait: item.wait,
              label: item.label,
              comment: item.comment,
              code: item.code,
              info: code.code,
            });
          }
        }
        this.dirty = false;
        this.sequence = 0;
        Common.emit('toastr_clear', this);
      },
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      Submit() {
        if(!this.remocon.remoconMacro) this.remocon.remoconMacro = {};
        if((this.ruleForm.name !== this.selectedMacro) &&
           this.remocon.remoconMacro[this.selectedMacro]) {
          this.$delete(this.remocon.remoconMacro, this.selectedMacro);
        }
        this.$set(this.remocon.remoconMacro, this.ruleForm.name, { comment: this.ruleForm.comment, macro: this.macro });
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.dirty = false;
        this.selectedMacro = null;
        Common.emit('toastr_info', this, 'マクロを登録しました。<br>編集する場合はマクロを選択してください。');
      },
      Remove() {
        this.removeDialog = false;
        if(this.remocon.remoconMacro[this.selectedMacro]) {
          this.$delete(this.remocon.remoconMacro, this.selectedMacro);
          Common.emit('changeRemocon', this);
          Common.emit('toastr_info', this, 'マクロを削除しました。');
        }
        this.sequence = 0;
        this.dirty = false;
        this.selectedMacro = null;
      },
    },
  };
</script>

<style scoped>

  .remocon-table th, .remocon-table td {
    padding: 1px !important;
  }
</style>

