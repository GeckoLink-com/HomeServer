<template>
  <el-container>
    <el-aside :width="$root.$el.clientWidth > 768 ? '65%' : '90%'">
      <h4>UI設定</h4>
      <div id="ui-table" class="scrollable">
        <div class="well well-uisel">
          <table class="table ui-table" v-for="(room, roomIdx) of uiTable.RoomList" :key="'ui-itemRoomList' + roomIdx">
            <thead>
              <tr class="gray" @click="SelectItem('room', roomIdx)" :class="{success:('room'==selectedItem.type)&&(roomIdx==selectedItem.index)}" data-item-index="room" :data-room-index="roomIdx">
                <th width="25%">{{ room }}</th>
                <th width="20%"/>
                <th width="20%"/>
                <th width="30%"/>
                <th width="5%">
                  <el-button v-show="RoomDeleteEnable(room)" type="danger" icon="el-icon-delete" class="pull-right" @click="DeleteItem('room', room)" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, itemIdx) of uiTable.ItemList" :key="'ui-itemItemList' + itemIdx" v-if="item.room==room" @click="SelectItem(item.type, itemIdx)" :data-item-index="itemIdx" :data-room-index="roomIdx" :class="{success:('room'!=selectedItem.type)&&(itemIdx==selectedItem.index)}">
                <td>{{ item.label }}</td>
                <td>{{ StatusItem(item, 0) }}</td>
                <td>{{ StatusItem(item, 1) }}</td>
                <td>
                  <div class="btn-inline">
                    <el-button v-if="item.type=='aircon'" type="default">
                      aircon mode
                    </el-button>
                    <el-button v-if="item.type=='hue'" type="default">
                      ctemp
                    </el-button>
                    <el-button v-if="item.type=='hue'" type="default">
                      bright
                    </el-button>
                    <el-button v-if="item.type=='colorLight'" type="default">
                      red
                    </el-button>
                    <el-button v-if="item.type=='colorLight'" type="default">
                      green
                    </el-button>
                    <el-button v-if="item.type=='colorLight'" type="default">
                      blue
                    </el-button>
                    <el-button v-for="(btn, idx) of item.buttons" :key="'ui-itemButtons' + idx" type="primary">
                      {{ ButtonItem(item, idx) }}
                    </el-button>
                    <el-button v-if="item.type=='tv'" type="default">
                      ch
                    </el-button>
                  </div>
                </td>
                <td>
                  <el-button v-show="('room'!=selectedItem.type)&&(itemIdx==selectedItem.index)" type="danger" icon="el-icon-delete" class="pull-right" @click="DeleteItem(item.type, itemIdx)" />
                </td>
              </tr>
            </tbody>
          </table>
          <table class="table ui-table">
            <thead>
              <tr class="blue" :class="{success:selectedItem.index==-1}" data-item-index="new" data-room-index="-1" @click="SelectItem('new', -1)">
                <th width="35%">新規項目追加</th>
                <th width="15%"/>
                <th width="15%"/>
                <th width="35%"/>
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </el-aside>

    <el-main class="ui-selector">
      <div class="well">
        <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left" @validate="Validated">
          <el-form-item label="項目の種類" prop="itemType">
            <el-select v-model="itemType">
              <el-option v-for="type of validTypeTable" :key="'ui-validTypeTable' + type.label" :label="type.label" :value="type.value" :disabled="type.value=='disabled'">
                {{ type.label }}
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="項目名" prop="itemName">
            <el-input type="text" v-model="ruleForm.itemName" />
          </el-form-item>
          <el-form-item label="他の呼び方" prop="itemAlias">
            <el-input type="text" v-model="itemAlias" />
          </el-form-item>
          <div v-if="itemType!='room'">
            <el-form-item label="ルーム" prop="itemRoom">
              <el-select v-model="itemRoom">
                <el-option v-for="room of uiTable.RoomList" :key="'ui-RoomList' + room" :label="room" :value="room">
                  {{ room }}
                </el-option>
              </el-select>
            </el-form-item>
          </div>
          <div v-if="(itemType!='room')&&(itemType!='hue')&&(itemType!='colorLight')">
            <div v-for="(stat, statIdx) of status" :key="'ui-status' + statIdx">
              <el-form-item :label="'ステータス' + statIdx" :prop="'status' + statusIdx">
                <el-select v-model="status[statIdx]" value-key="label">
                  <el-option v-for="(sensor, idx) of sensorList" :key="'ui-sensorList' + idx" :label="sensor.label" :value="sensor">
                    {{ sensor.label }}
                  </el-option>
                </el-select>
              </el-form-item>
            </div>
            <br>
          </div>

          <div v-if="itemType=='aircon'" class="well">
            <el-form-item label="リモコンGp" prop="airconGroup">
              <el-select v-model="airconGroup">
                <el-option v-for="(group, idx) of remocon.remoconGroup" :key="'ui-airconRemoconGp' + idx" v-if="group.type=='aircon'" :label="group.comment" :value="idx">
                  {{ group.comment }}
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="モジュール" prop="itemRoom">
              <el-select v-model="airconModule">
                <el-option v-for="module of remoconTxList" :key="'ui-airconRemoconTx' + module.deviceName" :label="module.label" :value="module.deviceName">
                  {{ module.label }}
                </el-option>
              </el-select>
            </el-form-item>
            <br>
          </div>

          <div v-if="(itemType!='room')&&(itemType!='hue')&&(itemType!='colorLight')">
            <div v-for="(btn,btnIdx) of button" class="well" :key="'ui-button' + btnIdx" v-if="btnIdx < buttonNum">
              <el-form-item :label="'ボタン' + btnIdx" :prop="'btn' + btnIndex + 'command'">
                <el-select v-model="btn.command" value-key="label">
                  <el-option v-for="cmd of commandList" :key="'ui-commandList' + cmd.label" :label="cmd.label" :value="cmd">
                    {{ cmd.label }}
                  </el-option>
                </el-select>
              </el-form-item>
              <div v-show="btn.command.type=='mode'">
                <el-form-item label="モード" :prop="'btn' + btnIndex + 'mode'">
                  <el-select v-model="btn.mode">
                    <el-option v-for="mode of btn.command.mode" :key="'ui-commandMode' + mode" :label="mode" :value="mode">
                      {{ mode }}
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div v-show="btn.command.type=='remocon'">
                <el-form-item label="リモコン" :prop="'btn' + btnIndex + 'remocon'">
                  <el-select v-model="btn.remocon">
                    <el-option v-for="(item,idx) of remocon.remoconTable" :key="'ui-remoconTable' + idx" :label="item.comment" :value="idx">
                      {{ item.comment }}
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div v-show="btn.command.type=='macro'">
                <el-form-item label="リモコンマクロ" :prop="'btn' + btnIndex + 'macro'">
                  <el-select class="form-control" v-model="btn.macro">
                    <el-option v-for="(item,idx) of remocon.remoconMacro" :key="'ui-remoconMacro' + idx" :label="item.comment" :value="idx">
                      {{ item.comment }}
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div v-show="(btn.command.type=='remocon')||(btn.command.type=='macro')" >
                <el-form-item label="モジュール" :prop="'btn' + btnIndex + 'module'">
                  <el-select v-model="btn.module">
                    <el-option v-for="(item,idx) of remoconTxList" :key="'ui-remoconTx' + idx" :label="item.label" :value="item.deviceName">
                      {{ item.label }}
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div v-show="((btn.command.type=='remocon')||(btn.command.type=='macro'))&&(itemType!='light')&&(itemType!='onOff')">
                <el-form-item label="ラベル" :prop="'btn' + btnIndex + 'label'">
                  <el-input type="text" v-model="btn.label" />
                </el-form-item>
              </div>
              <div v-show="((btn.command.type=='remocon')||(btn.command.type=='macro'))&&((itemType==='light')||(itemType==='onOff'))">
                <el-form-item label="モード" :prop="'btn' + btnIndex + 'mode'">
                  <el-select v-model="btn.mode">
                    <el-option v-for="mode of remoconMode" :key="'ui-remoconMode' + mode" :label="mode" :value="mode">
                      {{ mode }}
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
            </div>
            <br>
          </div>

          <div v-show="itemType=='tv'">
            <div class="well">
              <el-form-item label="リモコンGp" prop="tvGroup">
                <el-select v-model="tvGroup">
                  <el-option v-for="(group,idx) of remocon.remoconGroup" :key="'ui-tvRemoconGp' + idx" v-if="group.type=='tv'" :label="group.comment" :value="idx">
                    {{ group.comment }}
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="モジュール" prop="tvGroup">
                <el-select v-model="tvModule">
                  <el-option v-for="module of remoconTxList" :key="'ui-tvRemoconTx' + module.deviceName" :label="module.label" :value="module.deviceName">
                    {{ module.label }}
                  </el-option>
                </el-select>
              </el-form-item>
            </div>
            <br>
          </div>

          <div v-show="itemType=='hue'">
            <el-form-item label="ライト" prop="hueLight">
              <el-select v-model="hueLight" value-key="name">
                <el-option v-for="light of hueLights" :key="'ui-hueLights' + light.name" :label="light.name" :value="light">
                  {{ light.name }}
                </el-option>
              </el-select>
            </el-form-item>
            <br>
          </div>

          <div v-show="itemType=='colorLight'">
            <el-form-item label="ライト" prop="colorLight">
              <el-select v-model="colorLight" value-key="deviceName">
                <el-option v-for="light of colorLights" :key="'ui-colorLights' + light.deviceName" :label="light.deviceName" :value="light">
                  {{ light.deviceName }}
                </el-option>
              </el-select>
            </el-form-item>
            <br>
          </div>
        </el-form>
      </div>
      <br>

      <el-row class="pull-right">
        <el-button type="primary" @click="Submit">
          {{ (selectedItem.index==-1)?'追加':'修正' }}
        </el-button>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
  import { Tooltip, Select, Option, Form, FormItem, Input } from 'element-ui';
  import 'element-ui/lib/theme-chalk/tooltip.css';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';

  export default {
    components: {
      ElTooltip: Tooltip,
      ElSelect: Select,
      ElOption: Option,
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
        colorLights: [],
        typeTable: [
          { value: 'room', label: 'ルーム', buttons: 0 },
          { value: 'disabled', label: '-----------------------', buttons: 0 },
          { value: 'brind', label: 'ブラインド/カーテン', buttons: 2 },
          { value: 'shutter', label: 'シャッター', buttons: 2 },
          { value: 'window', label: '窓', buttons: 2 },
          { value: 'lock', label: '電気錠', buttons: 2 },
          { value: 'tv', label: 'テレビ', buttons: 4 },
          { value: 'aircon', label: 'エアコン', buttons: 1 },
          { value: 'light', label: '照明', buttons: 2 },
          { value: 'colorLight', label: '照明(color)', buttons: 0 },
          { value: 'hue', label: '照明(Hue)', buttons: 0 },
          { value: 'onOff', label: 'on/offスイッチ', buttons: 2 },
          { value: 'openClose', label: 'open/closeスイッチ', buttons: 2 },
          { value: 'other', label: 'その他', buttons: 4 },
        ],
        statusFunc: ['ad0', 'ad1', 'ad2', 'ad3', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'ha0', 'ha1', 'hai0', 'hai1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3', 'rainInfo', 'smartMeter'],
        commandFunc: ['gpio0', 'gpio1', 'ha0', 'ha1', 'hao0', 'hao1', 'sw', 'swio0', 'swio1', 'swio2', 'vsw0', 'vsw1', 'vsw2', 'vsw3'],
        gpioinType: ['motion', 'alarm', 'flap', 'other'],
        remoconMode: ['on', 'off', 'toggle'],
        remoconLabel: { on: 'on', off: 'off', toggle: 'on/off' },

        selectedItem: { type: 'new', index: -1 },
        itemType: '',
        itemAlias: '',
        nameAlert: '',
        itemRoom: '',
        status: [],
        airconGroup: '',
        airconModule: '',
        hueLight: '',
        colorLight: '',
        button: [],
        tvGroup: '',
        tvModule: '',
        sensorList: [{ }],
        commandList: [{ type: 'none' }],
        remoconTxList: [{ deviceName: 'server', label: '親機' }],
        ruleForm: {
          itemName: '',
        },
        rules: {
          itemName: [
            { required: true, message: '項目名を入れてください。', trigger: 'blur' },
            { validator: this.ValidateName.bind(this), trigger: 'blur' },
         ],
        },
        ruleValid: {
          itemName: true,
        },
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
      rulesValid() {
        for(const v in this.ruleValid) {
          if(!this.ruleValid[v]) return false;
        }
        return true;
      },
    },
    mounted() {
      this.select = false;

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

      this.uiTableElement = document.getElementById('ui-table');
      this.uiTableElement.addEventListener('mousedown', this.TouchStart.bind(this));
      this.uiTableElement.addEventListener('mousemove', this.TouchMove.bind(this));
      this.uiTableElement.addEventListener('mouseup', this.TouchEnd.bind(this));
      document.addEventListener('mouseup', this.TouchCancel.bind(this));
    },
    methods: {
      TouchStart(e) {
        const pos = this.GetCursorLine(e);
        if(pos == null) {
          this.select = false;
          return;
        }
        this.select = parseInt(this.selectedItem.index) === parseInt(pos.index);
        if(pos.index === 'room') this.select = parseInt(this.selectedItem.index) === parseInt(pos.room);
        if(!this.select) return;
        e.preventDefault();
        this.selectedPos = pos;
        this.currentPos = pos;
        if(pos.index === 'room') {
          this.dragItem = this.uiTable.RoomList[pos.room];
        } else {
          this.dragItem = this.uiTable.ItemList[pos.index];
        }
      },
      TouchMove(e) {
        if(!this.select) return;
        if(this.scrollTimer) clearTimeout(this.scrollTimer);
        this.scrollTimer = null;
        if(e.preventDefault) e.preventDefault();
        const offsetY = e.y - this.uiTableElement.offsetTop;
        if((offsetY < 0) || (offsetY > this.uiTableElement.clientHeight)) return;
        let scrollTop = this.uiTableElement.scrollTop;
        const topOffset = this.uiTableElement.clientHeight * 0.1 - offsetY;
        const bottomOffset = offsetY - this.uiTableElement.clientHeight * 0.9;
        if(topOffset > 0) {
          scrollTop -= topOffset;
          if(scrollTop < 0) scrollTop = 0;
        } else if(bottomOffset > 0) {
          scrollTop += bottomOffset;
          const scrollLimit = this.uiTableElement.scrollHeight - this.uiTableElement.cliemtHeight;
          if(scrollTop > scrollLimit) scrollTop = scrollLimit;
        }
        const scrollOffset = this.uiTableElement.scrollTop - scrollTop;
        if(scrollOffset) {
          this.uiTableElement.scrollTop = scrollTop;
          this.scrollTimer = setTimeout(() => {
            const el = document.elementFromPoint(e.x, e.y);
            this.TouchMove({x: e.x, y: e.y, target: el });
          }, 100);
        }

        const pos = this.GetCursorLine(e);
        if((pos == null) || (pos.index === 'new')) return;
        if((parseInt(pos.room) === parseInt(this.currentPos.room)) &&
           (parseInt(pos.index) === parseInt(this.currentPos.index))) return;
        if(this.selectedPos.index === 'room') {
          if(pos.index !== 'room') return;
          if(pos.room === this.currentPos.room) return;
          this.uiTable.RoomList.splice(this.currentPos.room, 1);
          this.uiTable.RoomList.splice(pos.room, 0, this.dragItem);
          this.currentPos = pos;
          this.selectedItem.index = this.currentPos.room;
        } else {
          this.uiTable.ItemList.splice(this.currentPos.index, 1);
          if(pos.index === 'room') {
            if((parseInt(pos.room) === parseInt(this.currentPos.room)) && (parseInt(pos.room) !== 0))  {
              this.uiTable.ItemList.push(this.dragItem);
              this.currentPos = { room: pos.room - 1, index: this.uiTable.ItemList.length - 1 };
            } else {
              this.uiTable.ItemList.unshift(this.dragItem);
              this.currentPos = { room: pos.room, index: 0 };
            }
          } else {
            this.uiTable.ItemList.splice(pos.index, 0, this.dragItem);
            this.currentPos = pos;
          }
          this.uiTable.ItemList[this.currentPos.index].room = this.uiTable.RoomList[this.currentPos.room];
          this.selectedItem.index = this.currentPos.index;
        }
      },
      TouchEnd(e) {
        if(!this.select) return;
        e.preventDefault();
        if(this.selectedPos.index === 'room') {
          if(parseInt(this.selectedPos.room) === parseInt(this.currentPos.room)) return;
        } else {
          if(parseInt(this.selectedPos.index) === parseInt(this.currentPos.index)) return;
        }
        Socket.emit('uiTable', this.uiTable);
        Common.emit('toastr_success', this, '修正されました。');
        this.select = false;
      },
      TouchCancel(e) {
        if(!this.select) return;
        e.preventDefault();
        this.select = false;
        if(this.selectedPos.index === 'room') {
          if(parseInt(this.selectedPos.room) === parseInt(this.currentPos.room)) return;
          this.uiTable.RoomList.splice(this.currentPos.room, 1);
          this.uiTable.RoomList.splice(this.selectedPos.room, 0, this.dragItem);
          this.currentPos = this.selectedPos;
          this.selectedItem.index = this.currentPos.room;
        } else {
          if(parseInt(this.selectedPos.index) === parseInt(this.currentPos.index)) return;
          this.uiTable.ItemList.splice(this.currentPos.index, 1);
          this.uiTable.ItemList.splice(this.selectedPos.index, 0, this.dragItem);
          this.currentPos = this.selectedPos;
          this.uiTable.ItemList[this.currentPos.index].room = this.uiTable.RoomList[this.currentPos.room];
          this.selectedItem.index = this.currentPos.index;
        }
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

        const colorLights = [];
        for(const dev in this.alias) {
          if(((parseInt(this.alias[dev].option, 16) >> 25) & 1) === 1) {
            colorLights.push({
              deviceName: this.alias[dev].name,
              label: this.alias[dev].name,
            });
          }
        }
        this.colorLights = colorLights;
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
          this.ruleForm.itemName = this.uiTable.RoomList[idx];
          return;
        }
        if(type === 'new') {
          this.selectedItem = { type: 'new', index: -1 };
          this.itemType = 'other';
          this.ruleForm.itemName = '新しい項目';
          this.itemAlias = '';
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
        if(this.uiTable.ItemList[idx] == null) return;

        const item = this.uiTable.ItemList[idx];
        this.selectedItem = { type: item.type, index: idx };
        this.itemType = item.type;
        this.ruleForm.itemName = item.label;
        this.itemAlias = item.alias;
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
                  if((this.itemType === 'light') || (this.itemType === 'onOff')) {
                    mode = item.buttons[i].mode;
                    label = this.remoconLabel[mode];
                  }
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
                  if((this.itemType === 'light') || (this.itemType === 'onOff')) {
                    mode = item.buttons[i].mode;
                    label = this.remoconLabel[mode];
                  }
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
        if(item.type === 'colorLight') {
          for(const i in this.colorLights) {
            if(this.colorLights[i].deviceName === item.table.deviceName) {
              this.colorLight = this.colorLights[i];
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
      Validated(prop, valid) {
        this.ruleValid[prop] = valid;
      },
      ValidateName(rule, value, callback) {
        if(this.itemType === 'room') {
          for(const room of this.uiTable.RoomList) {
            if(room === value) {
              return callback(new Error('存在するルーム名と同じ名前は付けられません。'));
            }
          }
        }
        callback();
      },
      Submit() {
        if(this.itemType === 'room') {
          if(this.selectedItem.type === 'new') {
            this.uiTable.RoomList.push(this.ruleForm.itemName);
          } else {
            const oldName = this.uiTable.RoomList[this.selectedItem.index];
            for(const item of this.uiTable.ItemList) {
              if(item.room === oldName) this.$set(item, 'room', this.ruleForm.itemName);
            }
            this.$set(this.uiTable.RoomList, this.selectedItem.index, this.ruleForm.itemName);
          }
          Socket.emit('uiTable', this.uiTable);
          this.selectedItem = { type: 'new', index: -1 };
          Common.emit('toastr_success', this, '登録されました。');
          return;
        }

        const item = {
          type: this.itemType,
          label: this.ruleForm.itemName,
          alias: this.itemAlias,
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
              if((this.itemType === 'light') || (this.itemType === 'onOff')) {
                item.buttons.push({
                  deviceName: btn.module,
                  command: btn.remocon,
                  mode: btn.mode,
                  label: btn.mode,
                });
              } else {
                item.buttons.push({
                  deviceName: btn.module,
                  command: btn.remocon,
                  label: btn.label,
                });
              }
              break;
            case 'macro':
              if((this.itemType === 'light') || (this.itemType === 'onOff')) {
                item.buttons.push({
                  deviceName: btn.module,
                  command: btn.macro,
                  mode: btn.mode,
                  label: btn.mode,
                });
              } else {
                item.buttons.push({
                  deviceName: btn.module,
                  command: btn.macro,
                  label: btn.label,
                });
              }
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
        if(this.itemType === 'colorLight') {
          item.status = [{
            deviceName: this.colorLight.deviceName,
            func: 'led',
            sensor: this.colorLight.deviceName,
            type: 'colorLight',
          }];
          item.buttons = [
            {
              command: 'led on',
              deviceName: this.colorLight.deviceName,
              label: 'on',
            },
            {
              command: 'led off',
              deviceName: this.colorLight.deviceName,
              label: 'off',
            },
          ];
          item.table = {
            prefix: '',
            deviceName: this.colorLight.deviceName,
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
        let el = e.target;
        while(el.nodeName !== 'TR') {
          if(el === document.body) return null;
          el = el.parentElement;
        }
        return { room: el.dataset.roomIndex, index: el.dataset.itemIndex };
      },
    },
  };
</script>

<style scoped>
  #ui-table {
    height: calc(100vh - 90px - 80px);
    width: 64vw;
    position: fixed;
  }

  .well-uisel {
    margin-right: 1vw;
  }

  .ui-selector {
    padding-top:70px;
  }

  table.ui-table {
    table-layout: fixed;
    margin: 0px;
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

  table.ui-table tr .el-button+.el-button {
    margin-left: 8px;
  }

  .btn-inline {
    display: flex;
    justify-content: flex-end;
  }

  .btn-inline .el-button {
    pointer-events: none;
  }

  .gray {
    background-color: #ddd;
  }

  .blue {
    background-color: #409eff;
    color: white;
  }

</style>


