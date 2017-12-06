<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-4 col-md-4 scrollable">
      <div class="well well-uisel">
        <div class="row well well-transparent">
          <div class="col-md-4">
            <h5>項目の種類</h5>
          </div>
          <div class="col-md-8">
            <select class="form-control ui-select-menu" v-model="itemType">
              <option v-for="type of validTypeTable" :value="type.value" :disabled="type.value=='disabled'">
                {{type.label}}
              </option>
            </select>
          </div>
        </div>
        <div class="row well well-transparent">
          <div class="col-md-4">
            <h5>項目名</h5>
          </div>
          <div class="col-md-8">
            <input class="input-transparent ui-func-name" type="text" :class="{error:nameAlert.length}" v-model="itemName" @input="NameCheck"/>
          </div>
        </div>
        <div class="row well well-transparent" v-if="nameAlert.length">
          <div class="col-md-offset-2">
            <h6 class="error">{{nameAlert}}</h6>
          </div>
        </div>

        <div v-show="itemType!='room'" class="row well well-transparent">
          <div class="col-md-4">
            <h5>ルーム</h5>
          </div>
          <div class="col-md-8">
            <select class="form-control ui-select-menu" v-model="itemRoom">
              <option v-for="room of uiTable.RoomList" :value="room">
                {{room}}
              </option>
            </select>
          </div>
        </div>
        <br>

        <div v-show="(itemType!='room')&&(itemType!='hue')" class="row well well-transparent" v-for="(stat, statIdx) of status">
          <div class="col-md-4">
            <h5>ステータス{{statIdx}}</h5>
          </div>
          <div class="col-md-8">
            <select class="form-control ui-select-menu" v-model="status[statIdx]">
              <option v-for="sensor of sensorList" :value="sensor">
                {{sensor.label}}
              </option>
            </select>
          </div>
        </div>
        <br v-show="(itemType!='room')&&(itemType!='hue')">

        <div v-show="itemType=='aircon'" class="row well well-func">
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>リモコンGp</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="airconGroup">
                <option v-for="(group, idx) of remocon.remoconGroup" v-if="group.type=='aircon'" :value="idx">
                  {{group.comment}}
                </option>
              </select>
            </div>
          </div>
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>モジュール</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="airconModule">
                <option v-for="module of remoconTxList" :value="module.deviceName">
                  {{module.label}}
                </option>
              </select>
            </div>
          </div>
        </div>
        <br v-show="itemType=='aircon'">

        <div v-show="(itemType!='room')&&(itemType!='status')&&(itemType!='hue')" class="row well well-func" v-for="(btn,btnIdx) of button" v-if="btnIdx<buttonNum">
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>ボタン{{btnIdx}}</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="btn.command">
                <option v-for="cmd of commandList" :value="cmd">
                  {{cmd.label}}
                </option>
              </select>
            </div>
          </div>
          <div v-show="btn.command.type=='mode'" class="row well well-transparent">
            <div class="col-md-4">
              <h5>モード</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="btn.mode">
                <option v-for="mode of btn.command.mode" :value="mode">
                  {{mode}}
                </option>
              </select>
            </div>
          </div>
          <div v-show="btn.command.type=='remocon'" class="row well well-transparent">
            <div class="col-md-4">
              <h5>リモコン</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="btn.remocon">
                <option v-for="(item,idx) of remocon.remoconTable" :value="idx">
                  {{item.comment}}
                </option>
              </select>
            </div>
          </div>
          <div v-show="btn.command.type=='macro'" class="row well well-transparent">
            <div class="col-md-4">
              <h5>リモコンマクロ</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="btn.macro">
                <option v-for="(item,idx) of remocon.remoconMacro" :value="idx">
                  {{item.comment}}
                </option>
              </select>
            </div>
          </div>
          <div v-show="(btn.command.type=='remocon')||(btn.command.type=='macro')" class="row well well-transparent">
            <div class="col-md-4">
              <h5>モジュール</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="btn.module">
                <option v-for="(item,idx) of remoconTxList" :value="item.deviceName">
                  {{item.label}}
                </option>
              </select>
            </div>
          </div>
          <div v-show="(btn.command.type=='remocon')||(btn.command.type=='macro')" class="row well well-transparent">
            <div class="col-md-4">
              <h5>ラベル</h5>
            </div>
            <div class="col-md-8">
              <input class="ui-func-name" type="text" v-model="btn.label"/>
            </div>
          </div>
        </div>
        <br v-show="(itemType!='room')&&(itemType!='status')&&(itemType!='hue')">

        <div v-show="itemType=='tv'" class="row well well-func">
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>リモコンGp</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="tvGroup">
                <option v-for="(group,idx) of remocon.remoconGroup" v-if="group.type=='tv'" :value="idx">
                  {{group.comment}}
                </option>
              </select>
            </div>
          </div>
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>モジュール</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="tvModule">
                <option v-for="module of remoconTxList" :value="module.deviceName">
                  {{module.label}}
                </option>
              </select>
            </div>
          </div>
        </div>
        <br v-show="itemType=='tv'">

        <div v-show="itemType=='hue'" class="row well well-func">
          <div class="row well well-transparent">
            <div class="col-md-4">
              <h5>ライト</h5>
            </div>
            <div class="col-md-8">
              <select class="form-control ui-select-menu" v-model="hueLight">
                <option v-for="light of hueLights" :value="light">
                  {{light.name}}
                </option>
              </select>
            </div>
          </div>
        </div>
        <br v-show="itemType=='hue'">

      </div>
      <br>

      <div class="row ui-submit-btn">
        <button class="btn btn-primary btn-sm pull-right" @click="Submit">
          {{(selectedItem.index==-1)?'追加':'修正'}}
        </button>
      </div>
    </div>

    <div class="col-sm-7 col-md-7 scrollable">
      <div class="well well-uisel" id="ui-table">
        <table class="table ui-table" v-for="(room, roomIdx) of uiTable.RoomList">
          <thead>
            <tr class="gray" @click="SelectItem('room', roomIdx)" data-id="room" :class="{success:('room'==selectedItem.type)&&(roomIdx==selectedItem.index)}">
              <th class="col-md-4">{{room}}</th>
              <th class="col-md-2"></th>
              <th class="col-md-2"></th>
              <th class="col-md-4">
                <button v-show="RoomDeleteEnable(room)" class="btn btn-xs btn-danger delete-btn pull-right" @click="DeleteItem('room', room)">
                  -
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, itemIdx) of uiTable.ItemList" v-if="item.room==room" @click="SelectItem(item.type, itemIdx)" :data-id="itemIdx" :class="{success:('room'!=selectedItem.type)&&(itemIdx==selectedItem.index)}">
              <td>{{item.label}}</td>
              <td>{{StatusItem(item, 0)}}</td>
              <td>{{StatusItem(item, 1)}}</td>
              <td>
                <button v-if="item.type=='aircon'" class="btn btn-default btn-xs btn-margin">
                  aircon mode
                </button>
                <div v-if="item.type=='hue'" class="btn-inline">
                  <button class="btn btn-default btn-xs btn-margin">
                    ctemp
                  </button>
                  <button class="btn btn-default btn-xs btn-margin">
                    bright
                  </button>
                </div>
                <button v-for="(btn, idx) of item.buttons" class="btn btn-primary btn-xs btn-margin">
                  {{ButtonItem(item, idx)}}
                </button>
                <button v-if="item.type=='tv'" class="btn btn-default btn-xs btn-margin">
                  ch
                </button>
                <button v-show="('room'!=selectedItem.type)&&(itemIdx==selectedItem.index)" class="btn btn-xs btn-danger delete-btn pull-right" @click="DeleteItem(item.type, itemIdx)">
                  -
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="table ui-table">
          <thead>
            <tr class="blue" :class="{success:selectedItem.index==-1}" @click="SelectItem('new', -1)">
              <th class="col-md-4">新規項目追加</th>
              <th class="col-md-2"></th>
              <th class="col-md-2"></th>
              <th class="col-md-4"></th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      display: false,
    },
    data() {
      return {
        uiTable: {
          RoomList: [],
          ItemList: [],
        },
        alias: {},
        remocon: {
          remoconTable: {},
          remoconGroup: {},
          remoconMacro: {},
        },
        hueLights: [],
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
      };
    },
    computed: {
      validTypeTable() {
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
      buttonNum() {
        for(const type of this.typeTable) {
          if(this.itemType === type.value) return type.buttons;
        }
      },
    },
    mounted() {
      this._select = false;

      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
        this.ChangeAlias();
      });
      this.remocon = Common.remocon;
      Common.on('changeRemocon', () => {
        this.remocon = Common.remocon;
      });
      this.hueLights = Common.hueLights;
      Common.on('changeHueBridges', () => {
        this.hueLights = Common.hueLights;
      });
      this.uiTable = Common.uiTable;
      Common.on('changeUITable', () => {
        this.uiTable = Common.uiTable;
      });
      this.SelectItem('new', -1);

      document.getElementById('ui-table').addEventListener('mousedown', (e) => {
        const pos = this.GetCursorLine(e);
        this._select = parseInt(this.selectedItem.index) === parseInt(pos.index);
        if(pos.index === 'room') this._select = this.selectedItem.index === pos.room;
        if(!this._select) return;
        e.preventDefault();
        this._selectedPos = pos;
        this._currentPos = pos;
        if(pos.index === 'room') {
          this._dragItem = this.uiTable.RoomList[pos.room];
        } else {
          this._dragItem = this.uiTable.ItemList[pos.index];
        }
      });
      document.getElementById('ui-table').addEventListener('mouseup', (e) => {
        if(!this._select) return;
        e.preventDefault();
        Socket.emit('uiTable', this.uiTable);
        Common.emit('toastr_success', this, '修正されました。');
        this._select = false;
      });
      document.getElementById('ui-table').addEventListener('mousemove', (e) => {
        if(!this._select) return;
        e.preventDefault();
        const pos = this.GetCursorLine(e);
        if((pos.room === this._currentPos.room) &&
           (parseInt(pos.index) === parseInt(this._currentPos.index))) return;
        if(this._selectedPos.index === 'room') {
          if(pos.index !== 'room') return;
          if(pos.room === this._currentPos.room) return;
          this.uiTable.RoomList.splice(this._currentPos.room, 1);
          this.uiTable.RoomList.splice(pos.room, 0, this._dragItem);
          this._currentPos = pos;
          this.selectedItem.index = this._currentPos.room;
        } else {
          if((pos.index === 'room') && (parseInt(pos.room) === 0)) return;
          this.uiTable.ItemList.splice(this._currentPos.index, 1);
          if(pos.index === 'room') {
            if(pos.room === this._currentPos.room) {
              this.uiTable.ItemList.push(this._dragItem);
              this._currentPos = { room: pos.room - 1, index: this.uiTable.ItemList.length - 1 };
            } else {
              this.uiTable.ItemList.unshift(this._dragItem);
              this._currentPos = { room: pos.room, index: 0 };
            }
          } else {
            this.uiTable.ItemList.splice(pos.index, 0, this._dragItem);
            this._currentPos = pos;
          }
          this.uiTable.ItemList[this._currentPos.index].room = this.uiTable.RoomList[this._currentPos.room];
          this.selectedItem.index = this._currentPos.index;
        }
      });
      document.addEventListener('mouseup', (e) => {
        if(!this._select) return;
        e.preventDefault();
        this._select = false;
        if(this._selectedPos.index === 'room') {
          if(this._selectedPos.room === this._currentPos.room) return;
          this.uiTable.RoomList.splice(this._currentPos.room, 1);
          this.uiTable.RoomList.splice(this._selectedPos.room, 0, this._dragItem);
          this._currentPos = this._selectedPos;
          this.selectedItem.index = this._currentPos.room;
        } else {
          if(parseInt(this._selectedPos.index) === parseInt(this._currentPos.index)) return;
          this.uiTable.ItemList.splice(this._currentPos.index, 1);
          this.uiTable.ItemList.splice(this._selectedPos.index, 0, this._dragItem);
          this._currentPos = this._selectedPos;
          this.uiTable.ItemList[this._currentPos.index].room = this.uiTable.RoomList[this._currentPos.room];
          this.selectedItem.index = this._currentPos.index;
        }
      });
    },
    methods: {
      NameCheck() {
        if(this.itemName.length === 0) {
          this.nameAlert = '項目名を入れてください。';
          return;
        }
        this.nameAlert = '';
      },
      StatusItem(item, idx) {
        let stat = '';
        if(item.status && item.status[idx]) {
          stat = item.status[idx].sensor;
          if(item.status[idx].deviceName && item.status[idx].func) stat = item.status[idx].deviceName + ':' + item.status[idx].func;
        }
        return stat;
      },
      ButtonItem(item, idx) {
        let lbl = item.buttons[idx].label;
        if((item.type === 'tv') && (lbl === 'vol+')) lbl = 'v+';
        if((item.type === 'tv') && (lbl === 'vol-')) lbl = 'v-';
        return lbl;
      },
      ChangeAlias() {
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
      SelectItem(type, idx) {
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
      DeleteItem(type, idx) {
        if(type === 'room') {
          const i = this.uiTable.RoomList.indexOf(idx);
          if(i >= 0) this.uiTable.RoomList.splice(i, 1);
        } else {
          this.uiTable.ItemList.splice(idx, 1);
        }
        Socket.emit('uiTable', this.uiTable);
        Common.emit('toastr_warning', this, '削除されました。');
      },
      Submit() {
        if(this.itemType === 'room') {
          for(const room of this.uiTable.RoomList) {
            if(room === this.itemName) {
              this.nameAlert = '存在するルーム名と同じ名前は付けられません。';
              return;
            }
          }
          if(this.selectedItem.type === 'new') {
            this.uiTable.RoomList.push(this.itemName);
          } else {
            const oldName = this.uiTable.RoomList[this.selectedItem.index];
            for(const item of this.uiTable.ItemList) {
              if(item.room === oldName) this.$set(item, 'room', this.itemName);
            }
            this.$set(this.uiTable.RoomList, this.selectedItem.index, this.itemName);
          }
          Socket.emit('uiTable', this.uiTable);
          this.selectedItem = { type: 'new', index: -1 };
          Common.emit('toastr_success', this, '登録されました。');
          return;
        }

        const item = {
          type: this.itemType,
          label: this.itemName,
          room: this.itemRoom,
        };

        for(const stat of this.status) {
          if((stat.deviceName === '') || (stat.func === '')) continue;
          let dev = null;
          for(const d in this.alias) {
            if(this.alias[d].name === stat.deviceName) {
              dev = d;
              break;
            }
          }
          if(!dev) continue;
          if(!Common.alias[dev]) continue;
          if(!Common.alias[dev][stat.func]) continue;
          if(!item.status) item.status = [];
          item.status.push({
            deviceName: stat.deviceName,
            func: stat.func,
            sensor: Common.alias[dev][stat.func].name || (stat.deviceName + ':' + stat.func),
            type: Common.alias[dev][stat.func].type,
          });
        }

        for(const i in this.button) {
          if(i >= this.buttonNum) break;
          const btn = this.button[i];
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
        if(this.itemType === 'aircon') {
          item.table = {
            prefix: this.airconGroup,
            deviceName: this.airconModule,
          };
        }
        if(this.itemType === 'tv') {
          item.table = {
            prefix: this.tvGroup,
            deviceName: this.tvModule,
          };
        }
        if(this.itemType === 'hue') {
          item.status = [{
            deviceName: this.hueLight.name,
            func: 'hue',
            sensor: this.hueLight.name,
            type: 'hue',
          }];
          item.buttons = [
            {
              command: 'switch on',
              deviceName: this.hueLight.name,
              label: 'on',
            },
            {
              command: 'switch off',
              deviceName: this.hueLight.name,
              label: 'off',
            },
          ];
          item.table = {
            prefix: '',
            deviceName: this.hueLight.name,
            device: this.hueLight.device,
          };
        }

        if(this.selectedItem.type === 'new') {
          this.uiTable.ItemList.push(item);
        } else {
          this.$set(this.uiTable.ItemList, this.selectedItem.index, item);
        }
        Socket.emit('uiTable', this.uiTable);
        this.selectedItem = { type: 'new', index: -1 };
        Common.emit('toastr_success', this, '登録されました。');
      },
      GetCursorLine(e) {
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
      },
    },
  };
</script>

<style scoped>
  table.ui-table {
    table-layout: fixed;
    margin-bottom: 0px;
  }

  table.ui-table tr {
    min-height: 24px;
  }

  table.ui-table tr th, table.ui-table tr td {
    font-size:11px;
    border-bottom: 1px solid #CCC;
    padding: 1px 5px;
    word-wrap: break-word;
    height: 25px;
  }

  .ui-submit-btn {
    vertical-align: middle;
    padding: 0 15px;
    margin:0 0;
  }

  .well-func {
    height:85%;
    width:100%;
    padding:0.7% 0 0.3% 0;
    margin: 0.5% 0;
    background-color: rgba(255,255,255,0);
  }

  .well-uisel {
    width: 100%;
    padding:1vh 0.5vw 1vh 0.5vw;
    margin: 0.5vh 0.2vw;
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

  .gray {
    background-color: #ccc;
  }

  .blue {
    background-color: #337ab7;
    color: white;
  }

  .input-transparent {
    background-color: rgba(255,255,255,0.5);
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


