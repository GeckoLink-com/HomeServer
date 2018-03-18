<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3 scrollable">
      <br>
      <h4>マクロ登録・編集</h4>
      <div class="well well-transparent">
        <br>
        <div class="row">
          <div class="col-md-12">
            <form class="btn-full">
              <select class="form-control ui-select-menu" v-model="selectedMacro" @change="SelectMacro">
                <option value="newMacro">
                  新規追加
                </option>
                <option v-for="(item,index) of remocon.remoconMacro" :key="'rm-remoconMacro' + index" :value="index">
                  {{ index }}
                </option>
              </select>
            </form>
          </div>
        </div>
        <br>
        <div class="row">
          <div class="col-md-4">
            <h5>登録名</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" v-model="name" :class="{error:!nameValid}" @input="NameCheck">
          </div>
        </div>
        <div class="row">
          <div class="col-md-offset-2">
            <h6>識別しやすい名前を付けてください。</h6>
            <h6 v-if="nameAlert.length" class="error">{{ nameAlert }}</h6>
          </div>
        </div>
        <br>
        <div class="row">
          <div class="col-md-4">
            <h5>コメント</h5>
          </div>
          <div class="col-md-8">
            <input class="ui-func-name" v-model="comment" :class="{error:!commentValid}" @input="CommentCheck">
          </div>
        </div>
        <div class="row" v-if="commentAlert.length">
          <div class="col-md-offset-2">
            <h6 class="error">{{ commentAlert }}</h6>
          </div>
        </div>

        <br>
        <div class="row">
          <div class="col-md-offset-4">
            <button v-show="(selectedMacro=='newMacro')&&(sequence==0)" class="btn btn-primary btn-sm btn-margin" @click="Start">開始</button>
            <button v-show="selectedMacro!='newMacro'" :disabled="dirty" class="btn btn-danger btn-sm btn-margin" @click="removeModal=!dirty">削除</button>
            <modal v-model="removeModal">
              <div slot="modal-header" class="modal-header">
                マクロ登録の削除
              </div>
              <div v-if="selectedMacro!='newMacro'" slot="modal-body" class="modal-body">
                {{ selectedMacro }}を削除します。よろしいですか？
              </div>
              <div v-if="selectedMacro=='newMacro'" slot="modal-body" class="modal-body">
                削除しました。
              </div>
              <div slot="modal-footer" class="modal-footer">
                <button type="button" class="btn btn-default" @click="removeModal = false">中止</button>
                <button type="button" class="btn btn-primary" @click="Remove" >実行</button>
              </div>
            </modal>
            <button v-show="(selectedMacro!='newMacro')||(sequence!=0)" :disabled="!dirty" class="btn btn-danger btn-sm btn-margin" @click="Cancel">中止</button>
            <button class="btn btn-primary btn-sm btn-margin" :disabled="!dirty" @click="Submit">保存</button>
          </div>
        </div>
      </div>
    </div>
    <div class="col-sm-9 col-md-9 scrollable">
      <br>
      <div v-if="macro.length > 0" class="well well-transparent">
        <table class="table table-striped remocon-table">
          <thead>
            <tr>
              <th class="col-md-4">登録名</th>
              <th class="col-md-8">コメント</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) of macro" :key="'rm-macro' + idx">
              <td v-if="item.wait!=null">
                <input class="remocon-inline-input" type="number" step="0.1" v-model="item.wait" @change="dirty=true">
                秒
              </td>
              <td v-if="item.wait!=null">待ち時間</td>
              <td v-if="item.wait==null">
                <select class="form-control remocon-select-menu" v-model="item.label" @change="dirty=true">
                  <option v-for="(remocon,idx) of remocon.remoconTable" :key="'rm-remoconTable' + idx" :value="idx">
                    {{ idx }}
                  </option>
                </select>
              </td>
              <td v-if="item.wait==null">
                {{ item.label?remocon.remoconTable[item.label].comment:item.info }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
  import { modal } from 'vue-strap';

  export default {
    components: {
      modal,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        macro: [],
        remocon: {
          remoconTable: {},
          remoconGroup: {},
          remoconMacro: {},
        },
        selectedMacro: 'newMacro',
        name: '',
        nameValid: false,
        nameAlert: '登録名を4文字以上で入れてください。',
        comment: '',
        commentValid: false,
        commentAlert: 'コメントを入れてください。',
        dirty: false,
        sequence: 0,
        removeModal: false,
      };
    },
    mounted() {
      Socket.on('events', (msg) => {
        if((msg.type !== 'irreceive') || !this) return;
        if(msg.data[0].deviceName !== 'server') return;
        if(this.sequence < 1) return;

        const remoconCode = msg.data[0].code;
        const code = Common.RemoconSearch(remoconCode);
        const now = new Date();
        if(this.macro.length > 0) {
          let wait = now - this._lastEvent;
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
        this._lastEvent = now;
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
          this.name = '';
          this.NameCheck();
          this.comment = '';
          this.CommentCheck();
          this.macro = [];
        } else {
          this.name = this.selectedMacro;
          this.nameValid = true;
          this.comment = this.remocon.remoconMacro[this.name].comment;
          this.commentValid = true;
          this.macro = [];
          for(const item of this.remocon.remoconMacro[this.name].macro) {
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
        this.$nextTick(() => { this.dirty = false; });
      },
      NameCheck() {
        if(this.name.length < 4) {
          this.nameValid = false;
          this.nameAlert = '登録名を4文字以上で入れてください。';
          return;
        }
        if(this.remocon && this.remocon.remoconMacro && this.remocon.remoconMacro[this.name]) {
          this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？';
        } else {
          this.nameAlert = '';
        }
        this.nameValid = true;
        this.dirty = true;
      },
      CommentCheck() {
        if(this.comment.length === 0) {
          this.commentValid = false;
          this.commentAlert = 'コメントを入れてください。';
          return;
        }
        this.commentAlert = '';
        this.commentValid = true;
        this.dirty = true;
      },
      Start() {
        if(this.sequence !== 0) return;
        this.sequence = 1;
        Common.emit('toastr_info', this, 'リモコンの操作手順を順番に記録します。<br>リモコンのボタンは<strong>長押ししない</strong>で下さい。');
        this.nameAlert = '';
      },
      Cancel() {
        this.sequence = 0;
        this.dirty = false;
        this.SelectMacro();
        Common.emit('toastr_clear', this);
      },
      Submit() {
        if(!this.nameValid || !this.commentValid) return;
        if(!this.remocon.remoconMacro) this.remocon.remoconMacro = {};
        if((this.name !== this.selectedMacro) &&
           this.remocon.remoconMacro[this.selectedMacro]) {
          this.$delete(this.remocon.remoconMacro, this.selectedMacro);
        }
        this.$set(this.remocon.remoconMacro, this.name, { comment: this.comment, macro: this.macro });
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.dirty = false;
        this.selectedMacro = this.name;
      },
      Remove() {
        this.removeModal = false;
        if(this.dirty) return;
        if(this.remocon.remoconMacro[this.selectedMacro]) {
          this.$delete(this.remocon.remoconMacro, this.selectedMacro);
        }
        Common.emit('changeRemocon', this);
        this.sequence = 0;
        this.dirty = false;
        this.selectedMacro = 'newMacro';
        this.SelectMacro();
      },
    },
  };
</script>

<style scoped>
  .ui-func-name {
    width:100%;
  }

  .btn-full {
    display:inline-block;
    margin-left: 0.2vw;
    width: 100%;
  }

  .btn-margin {
    margin-right:0.2vw;
  }

  .remocon-inline-input {
    border: 0px;
    margin-left: 15px;
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

