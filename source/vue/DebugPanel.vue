<template>
  <ElContainer>
    <ElAside :width="$root.$el.clientWidth > 768 ? '35%' : '90%'">
      <h4>debug</h4>

      <div class="well-transparent">
        <h5>ControlServer Command</h5>
        <ElInput type="textarea" class="textarea" :rows="3" v-model="command" />
        <ElSelect v-model="selectedModule" placeholder="送信するモジュール" value-key="label" @change="SelectModule">
          <ElOption v-for="module of moduleList" :key="'debug-moduleList' + module.device" :disabled="!module.enable" :label="module.label" :value="module" />
        </ElSelect>
      </div>

      <div class="well-transparent">
        <h5>ControlServer Response</h5>
        <ElInput id="response" type="textarea" class="textarea" :rows="8" v-model="response" />
      </div>
      <div class="well-transparent">
        <h5>Sensor Event</h5>
        <ElInput id="events" type="textarea" class="textarea" readonly :rows="8" :value="events" />
      </div>
    </ElAside>

    <ElMain>
      <div v-show="devices && (devices.length > 0)" class="well-transparent scrollable-x">
        <h5>Modules</h5>
        <table class="table">
          <thead>
            <tr>
              <th>name</th>
              <th>module</th>
              <th>type</th>
              <th>net</th>
              <th>option</th>
              <th>param</th>
              <th>XBeeHW</th>
              <th>version</th>
              <th>rev</th>
              <th>power</th>
              <th>state</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dev of actualDevices" :key="'debug-actualDevices' + dev.device">
              <td>{{ dev.deviceName?dev.deviceName:'-' }}</td>
              <td>{{ dev.device }}</td>
              <td>{{ dev.type?dev.type:'-' }}</td>
              <td>{{ dev.networkAddr?dev.networkAddr:'-' }}</td>
              <td>{{ dev.option?dev.option:'-' }}</td>
              <td>{{ dev.param?parseInt(dev.param):'-' }}</td>
              <td>{{ dev.xbeeVersion?dev.xbeeVersion:'-' }}</td>
              <td>{{ dev.version?dev.version:'-' }}</td>
              <td>{{ dev.revision?dev.revision:'-' }}</td>
              <td>{{ dev.voltage?dev.voltage:'-' }}</td>
              <td>{{ dev.state }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-show="status && (status.length > 0)" class="well-transparent">
        <h5>Sensor Status</h5>
        <table class="table">
          <thead>
            <tr>
              <th>device</th>
              <th>function</th>
              <th>value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stat, idx) of status" :key="'debug-status' + idx">
              <td>{{ stat.deviceName?stat.deviceName:stat.device }}</td>
              <td>{{ stat.funcName?stat.funcName:stat.func }}</td>
              <td>{{ stat.valueName?stat.valueName:stat.value }}</td>
            </tr>
          </tbody>
        </table>
        <br>
      </div>

      <div v-show="queue.writeQueue && (queue.writeQueue.length > 0)" class="well-transparent">
        <h5>ControlSerever WriteQueue</h5>
        <table class="table">
          <thead>
            <tr>
              <th>module</th>
              <th>seqID</th>
              <th>command</th>
              <th>dump</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q of queue.writeQueue" :key="'debug-writeQueue' + q.device">
              <td>{{ q.device }}</td>
              <td>{{ q.sequenceID }}</td>
              <td>{{ q.command }}</td>
              <td>{{ QueueDecode(q.code) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="queue.readQueue && (queue.readQueue.length > 0)" class="well-transparent">
        <h5>ControlSerever ReadQueue</h5>
        <table class="table">
          <thead>
            <tr>
              <th>dump</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q of queue.readQueue" :key="'debug-readQueue' + q.code">
              <td>{{ QueueDecode(q.code) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="controllerLog.length > 0" class="well-transparent">
        <h5>controller log</h5>
        <table class="table">
          <thead>
            <tr>
              <th width="20%">
                time
              </th>
              <th width="10%">
                type
              </th>
              <th width="20%">
                module
              </th>
              <th width="50%">
                message
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l,idx) of controllerLog" :key="'debug-controllerLog' + idx">
              <td>{{ l.timeStamp.substr(5, 11) }}</td>
              <td>{{ l.type }}</td>
              <td>{{ l.body.deviceName||l.body.device }}</td>
              <td>{{ LogText(l) }}</td>
            </tr>
          </tbody>
        </table>
        <br>
      </div>
    </ElMain>
  </ElContainer>
</template>

<script>
  import { Select, Option, Input } from 'element-ui';
  import 'element-ui/lib/theme-chalk/select.css';
  import 'element-ui/lib/theme-chalk/option.css';
  import 'element-ui/lib/theme-chalk/input.css';

  export default {
    components: {
      ElSelect: Select,
      ElOption: Option,
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
        devices: Common.devices,
        hueBridges: Common.hueBridges || [],
        alias: Common.alias,
        command: '',
        response: '',
        responseFlag: false,
        events: '',
        eventsFlag: false,
        status: [],
        queue: [],
        controllerLog: [],
      };
    },
    computed: {
      actualDevices() {
        const actualDevices = this.devices.filter((dev) => {
          return dev.device !== 'pairing';
        });
        for(const bridge of this.hueBridges) {
          for(const l in bridge.lights) {
            actualDevices.push({
              device: 'Hue_' + bridge.id + '_' + l,
              deviceName: bridge.lights[l].name,
              type: bridge.lights[l].modelid,
              version: bridge.lights[l].swversion,
              state: bridge.lights[l].state.on?'on':'off',
            });
          }
        }
        return actualDevices;
      },
      moduleList() {
        const moduleList = [];
        moduleList.push({ device: 0, label: 'server', enable: true });
        for(const dev of this.devices) {
          if(dev.device === 'pairing') continue;
          let name = '';
          if(dev.device in this.alias) name = this.alias[dev.device].name;
          moduleList.push({
            device: dev.device,
            name: name,
            label: dev.device + ((name.length > 0) ? ':' : '') + name,
            enable: dev.state === 'alive',
          });
        }
        return moduleList;
      },
    },
    mounted() {
      Socket.on('status', (status) => {
        this.status = status;
      });
      Socket.on('response', (msg) => {
        for(const data of msg.data) {
          switch (msg.type) {
            case 'response':
              if('message' in data) this.response += data.message;
              this.response += 'status : ' + data.status + '\n';
              break;
            case 'message':
              this.response += data.message;
              break;
            default:
              break;
          }
        }
        this.responseFlag = true;
      });
      Socket.on('events', (msg) => {
        let events = '[' + msg.type + ']\n';
        for(const data of msg.data) {
          switch (msg.type) {
            case 'change':
              events += '  ' + (data.funcName ? data.funcName : ((data.deviceName ? data.deviceName : data.device) + ' : ' + data.func)) + ' ' + data.value + '\n';
              break;
            case 'irreceive':
              events += '  module : ' + (data.deviceName ? data.deviceName : data.device) + '\n';
              events += '  format : ' + data.format + '\n';
              if('code' in data) {
                events += '  code : ';
                for(const d of data.code) {
                  events += ('0' + d.toString(16)).slice(-2) + ' ';
                }
                events += '\n';
              }
              if('name' in data) {
                events += '  name : ' + data.name + '\n';
              }
              if('comment' in data) {
                events += '  comment : ' + data.comment + '\n';
              }
              break;
            case 'motor':
              events += JSON.stringify(data) + '\n';
              break;
            default:
              break;
          }
        }
        this.events += events;
        this.eventsFlag = true;
      });
      Socket.on('queueInfo', (queue) => {
        this.queue = queue.data;
      });
      Socket.on('controllerLog', (log) => {
        this.controllerLog = log.sort((a, b) => {
          if(a.timeStamp < b.timeStamp) return 1;
          if(a.timeStamp > b.timeStamp) return -1;
          return 0;
        });
      });
      this.devices = Common.devices;
      Common.on('changeDevices', () => {
        this.devices = Common.devices || [];
      });
      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
      });
      this.hueBridges = Common.hueBridges;
      Common.on('changeHueBridges', () => {
        this.hueBridges = Common.hueBridges;
      });
    },
    updated() {
      if(this.responseFlag) {
        const responsePanel = document.getElementById('response');
        responsePanel.scrollTop = responsePanel.scrollHeight;
        this.responseFlag = false;
      }
      if(this.eventsFlag) {
        const eventPanel = document.getElementById('events');
        eventPanel.scrollTop = eventPanel.scrollHeight;
        this.eventsFlag = false;
      }
    },
    methods: {
      SelectModule(module) {
        Socket.emit('command', {
          type: 'command',
          device: module.device,
          command: this.command.replace(/[\r\n]+/g, ' '),
        });
        this.selectedModule = null;
      },
      QueueDecode(code) {
        let ret = '';
        for(const j in code) {
          ret += ('0' + code[j].toString(16)).slice(-2) + ' ';
        }
        return ret;
      },
      LogText(msg) {
        switch (msg.type) {
          case 'command':
            return msg.body.command;
          case 'response':
            return (msg.body.origin.command || msg.body.origin.func + ' ' + msg.body.origin.mode) + ' -> ' + msg.body.status;
          case 'change':
            return msg.body.funcName + ' ' + msg.body.func + ' = ' + msg.body.valueName;
          case 'irreceive':
            return msg.body.format + ' ' + msg.body.comment;
          default:
            return '';
        }
      },
    },
  };
</script>

<style scoped>
  .table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
      color: #606266;
      font-family: Courier, 'NotoSansMonoCJKjp', monospace;
  }

  .scrollable-x {
    overflow-x: auto;
  }

  .table th, .table td {
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
  }

  .table th {
      background: #E6EAFF;
  }

  .textarea {
    font-size: 1em;
  }
</style>

