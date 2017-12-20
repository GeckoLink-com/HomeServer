<template>
  <div v-show="display" class="container-fluid tab-panel" @click="ClearSelect">
    <div class="col-sm-3 col-md-3 scrollable">
      <br>
      <h4>通常設定</h4>
      <div class="well">
        <h5>
          リモコンコード
        </h5>
        <a id="remocon-save" style="display:none" href="/remocon/gecko_remocon.json"/>
        <button @click="Save" class="btn btn-xs btn-primary system-config-btn">ファイルに保存</button>
        <input @change="LoadFile" id="remocon-load" type="file" accept="text/json" style="display:none" >
        <button type="button" @click="Load" class="btn btn-xs btn-primary system-config-btn">ファイルから追加</button>
        <h6 class="system-config-btn">
          同じ登録名のコードは<br>
          上書きされます。
        </h6>
      </div>
      <div class="row">
        <alert :type="(!selectedIdx&&!selectedGroup)?'success':'default'">
          リモコンコードを追加する場合は、本機に向けてリモコンを送信してください。
        </alert>
        <alert :type="(selectedIdx||selectedGroup)?'success':'default'">
          リモコンコードを削除する場合は、右の登録済みリモコン一覧から選択し赤いボタンを押してください。
        </alert>
        <alert :type="(selectedGroup)?'success':'default'">
          グループ登録されているコード(エアコン設定・TV設定で登録したコード)はまとめて消去されます。
        </alert>
      </div>
      <br>
    </div>
    <div class="col-sm-9 col-md-9 scrollable">
      <br>
      <fieldset v-show="(Object.keys(lastRemoconCode).length == 0)">
        <h5>本機に向けて登録したいリモコンを送信してください。</h5>
      </fieldset>
      <fieldset v-show="(Object.keys(lastRemoconCode).length != 0)">
        <h5>最後に受信したリモコンコード</h5>
        <table class="table table-striped remocon-table">
          <thead>
            <tr>
              <th class="col-md-2">モジュール</th>
              <th class="col-md-2">フォーマット</th>
              <th class="col-md-7">コード</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item of lastRemoconCode" :key="item.deviceName" :class="{success:(selectedItem&&(item==selectedItem))}" @click="SelectRemocon(item)">
              <td>{{ item.deviceName }}</td>
              <td>{{ item.format }}</td>
              <td>{{ item.info }}</td>
            </tr>
          </tbody>
        </table>
        <h5>登録するリモコンコードを選択して下さい。</h5>
      </fieldset>

      <fieldset v-show="selectedItem != null">
        <div class="row">
          <div class="col-md-5">
            <label>登録名</label>
            <input type="text" :class="{error:!nameValid}" v-model="name" @input="NameCheck">
          </div>
          <div class="col-md-5">
            <label>コメント</label>
            <input type="text" :class="{error:!commentValid}" v-model="comment" @input="CommentCheck">
          </div>
          <div class="col-md-2">
            <div class="row">
              <button @click="Cancel" class="btn btn-danger" type="button">中止</button>
              <button @click="Submit" :disabled="!nameValid||!commentValid" class="btn btn-primary" type="button">保存</button>
            </div>
          </div>
        </div>
        <h6>種類＋メーカー名＋シリーズ名＋機能名など、識別しやすい名前を付けて下さい。</h6>
        <h6 v-if="nameAlert.length" class="error">{{ nameAlert }}</h6>
        <h6 v-if="commentAlert.length" class="error">{{ commentAlert }}</h6>
      </fieldset>

      <fieldset v-show="remocon.remoconTable && (Object.keys(remocon.remoconTable).length > 0)">
        <p class="vertical-space2"/><h5>登録済みリモコン一覧</h5>
        <div class="well well-transparent">
          <table class="table remocon-table">
            <thead>
              <tr class="gray">
                <th class="col-md-5">登録名<br>コメント</th>
                <th class="col-md-7">コード</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item,idx) of remocon.remoconTable" :key="idx" v-if="!item.group||(item.group=='')" @click.stop="SelectItem(idx)" :class="{success:IsSelect(item,idx)}">
                <td class="col-md-5">
                  <button class="btn btn-xs btn-single pull-left remocon-btn" @click.stop="IRSend(item, idx)">
                    >
                  </button>
                  <div>
                    {{ idx }}<br>
                    {{ item.comment }}
                  </div>
                </td>
                <td class="col-md-7">
                  {{ Decode(item.code) }}
                  <button v-show="(idx===selectedIdx)" class="btn btn-xs btn-danger delete-btn pull-right remocon-btn" @click="DeleteItem(item, idx)">
                    -
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <table class="table remocon-table" v-for="(group, groupName) of remocon.remoconGroup" :key="groupName">
            <tbody>
              <tr @click.stop="SelectGroup(groupName)" :class="{success:(groupName==selectedGroup)}">
                <td class="col-md-5">
                  <div>
                    {{ groupName }}<br>{{ group.comment }}
                  </div>
                </td>
                <td class="col-md-7">
                  <button v-show="(selectedGroup==groupName)" class="btn btn-xs btn-danger delete-btn pull-right remocon-btn" @click="DeleteGroup(groupName)">
                    -
                  </button>
                </td>
              </tr>
              <tr v-for="(item,idx) of remocon.remoconTable" :key="idx" v-if="(item.group==selectedGroup)&&(item.group==groupName)">
                <td class="col-md-5">
                  <button class="btn btn-xs btn-single pull-left remocon-btn" @click.stop="IRSend(item, idx)">
                    >
                  </button>
                  <div>
                    {{ idx }}<br>
                    {{ item.comment }}
                  </div>
                </td>
                <td class="col-md-7">
                  {{ Decode(item.code) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>

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
        lastRemoconCode: {},
        name: '',
        nameValid: false,
        comment: '',
        commentValid: false,
        nameAlert: '',
        commentAlert: '',
        selectedGroup: null,
        selectedItem: null,
        selectedIdx: null,
      };
    },
    mounted() {
      this._reader = new FileReader();

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

      this._remoconLoad = document.getElementById('remocon-load');
      this._remoconSave = document.getElementById('remocon-save');
    },
    methods: {
      Save() {
        const dt = new Date();
        this._remoconSave.href = this._remoconSave.origin +
          '/remocon/gecko_remocon_' +
          dt.getFullYear() +
          ('0' + (dt.getMonth() + 1)).slice(-2) +
          ('0' + dt.getDate()).slice(-2) +
          '.json.gz';
        this._remoconSave.click();
      },
      Load() {
        this._remoconLoad.value = '';
        this._remoconLoad.click();
      },
      LoadFile() {
        this._reader.onloadend = (e) => {
          if(e.target.readyState === FileReader.DONE) {
            Socket.emit('addRemocon', this._reader.result);
          } else {
            Common.emit('toastr_error', this, 'ファイルが読み込めません。');
          }
        };
        this._reader.readAsArrayBuffer(this._remoconLoad.files[0]);
      },
      Decode(code) {
        return Common.RemoconSearch(code).code;
      },
      SelectRemocon(item) {
        this.selectedItem = item;
        this.name = item.name;
        this.NameCheck();
        this.comment = item.comment;
        this.CommentCheck();
      },
      NameCheck() {
        if(!this.name || (this.name.length < 4)) {
          this.nameValid = false;
          this.nameAlert = '登録名を4文字以上で入れてください。';
          return;
        }
        if(this.remocon.remoconTable[this.name]) {
          if(this.remocon.remoconTable[this.name].group) {
            this.nameValid = false;
            this.nameAlert = 'エアコン・テレビのコード名と同じ名前は登録できません。';
            return;
          }
          this.nameAlert = '登録名が既に存在しています。上書きしますがよろしいですか？';
        } else {
          this.nameAlert = '';
        }
        this.nameValid = true;
      },
      CommentCheck() {
        if(!this.comment || (this.comment.length === 0)) {
          this.commentValid = false;
          this.commentAlert = 'コメントを入れてください。';
          return;
        }
        this.commentValid = true;
        this.commentAlert = '';
      },
      Cancel() {
        Common.emit('toastr_clear', this);
        this.selectedItem = null;
      },
      Submit() {
        if(!this.nameValid || !this.commentValid) return;
        this.nameAlert = '';
        this.commentAlert = '';
        const name = this.name;
        const comment = this.comment;
        const code = this.selectedItem.code;
        this.remocon.remoconTable[name] = { comment: comment, code: code };
        Common.emit('changeRemocon', this);
        Common.emit('toastr_clear', this);
        this.selectedItem = null;
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
        let cmd = 'ir 20';
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

  .vertical-space2 {
    margin-top: 10vh;
  }

  .gray {
    background-color: #ccc;
  }

  .remocon-select-menu {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:12px;
    margin: 0px;
    padding:0px;
    text-align: center;
    width: 70%;
    height:20px;
    line-height:20px;
    background-color: rgba(255,255, 255, 0);
  }

  .remocon-table {
    margin: 0px;
  }

  .remocon-table th, .remocon-table td {
    padding: 1px !important;
    line-height: 20px !important;
    border-top: 1px solid #ddd;
  }

  .remocon-btn {
    line-height: 20px !important;
    width: 1em;
    vertical-align: middle;
    margin: 6px 6px;
    padding: 4px 10px 4px 5px;
  }
</style>


