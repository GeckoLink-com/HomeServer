<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-5 col-md-5 scrollable">
      <div class="row">
        <h4>ControlServer Command</h4>
        <textarea cols="40" rows="3" v-model="command"></textarea>
      </div>
      <div class="row">
        <dropdown class="moduleLabel" text="Send">
          <li v-for="dev of moduleList" class="module-list" :class="{disabled:!dev.enable}">
            <a href="#" @click="SelectModule" :data-device="dev.device" :data-enable="dev.enable" :disabled="!dev.enable">
              {{dev.label}}
            </a>
          </li>
        </dropdown>
        <h4>ControlServer Response</h4>
        <textarea id="response" cols="40" rows="8" readonly :value="response" ></textarea>
        <h4>Sensor Event</h4>
        <textarea id="events" cols="40" rows="8" readonly :value="events"></textarea>
      </div>
    </div>
    <div class="col-sm-7 col-md-7 scrollable">
      <div class="row">
        <div v-show="devices && (devices.length > 0)">
          <h4>Modules</h4>
          <table class="device-table">
            <thead>
              <tr>
                <th>name</th>
                <th>module</th>
                <th>type</th>
                <th>net</th>
                <th>option</th>
                <th>param</th>
                <th>version</th>
                <th>power</th>
                <th>state</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dev of actualDevices">
                <td>{{dev.deviceName?dev.deviceName:'-'}}</td>
                <td>{{dev.device}}</td>
                <td>{{dev.type?dev.type:'-'}}</td>
                <td>{{dev.networkAddr?dev.networkAddr:'-'}}</td>
                <td>{{dev.option?dev.option:'-'}}</td>
                <td>{{dev.param?parseInt(dev.param, 16):'-'}}</td>
                <td>{{dev.version?dev.version:'-'}}</td>
                <td>{{dev.voltage?dev.voltage:'-'}}</td>
                <td>{{dev.state}}</td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>
        <div v-show="status && (status.length > 0)">
          <h4>Sensor Status</h4>
          <table class="status-table">
            <thead>
              <tr>
                <th>device</th>
                <th>function</th>
                <th>value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat of status">
                <td>{{stat.deviceName?stat.deviceName:stat.device}}</td>
                <td>{{stat.funcName?stat.funcName:stat.func}}</td>
                <td>{{stat.valueName?stat.valueName:stat.value}}</td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>
        <h4 v-show="(queue.writeQueue && (queue.writeQueue.length > 0))||(queue.readQueue && (queue.readQueue.length > 0))">ControlSerever Queue</h4>
        <div v-show="queue.writeQueue && (queue.writeQueue.length > 0)">
          <h5>write queue</h5>
          <table class="queue-table">
            <thead>
              <tr>
                <th>module</th>
                <th>seqID</th>
                <th>command</th>
                <th>dump</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q of queue.writeQueue">
                <td>{{q.device}}</td>
                <td>{{q.sequenceID}}</td>
                <td>{{q.command}}</td>
                <td>{{QueueDecode(q.code)}}</td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>
        <div v-show="queue.readQueue && (queue.readQueue.length > 0)">
          <h5>read queue</h5>
          <table class="queue-table">
            <thead>
              <tr>
               <th>dump</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q of queue.readQueue">
                <td>{{QueueDecode(q.code)}}</td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>

        <div v-show="controllerLog.length > 0">
          <h4>controller log</h4>
          <table class="controllerLog-table">
            <thead>
              <tr>
               <th class="col-sm-2">time</th>
               <th class="col-sm-1">type</th>
               <th class="col-sm-2">module</th>
               <th class="col-sm-7">message</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l of controllerLog">
                <td>{{l.timeStamp.substr(5, 11)}}</td>
                <td>{{l.type}}</td>
                <td>{{l.body.deviceName||l.body.device}}</td>
                <td>{{LogText(l)}}</td>
              </tr>
            </tbody>
          </table>
          <br>
        </div>

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
        devices: Common.devices,
        hueLights: Common.hueLights || [],
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
        return this.devices.filter((dev) => {
          return dev.device !== 'pairing';
        });
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
        for(const dev of this.hueLights) {
          moduleList.push({
            device: dev.device,
            name: dev.name,
            label: dev.name,
            enable: true,
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
        this.controllerLog = log;
      });
      this.devices = Common.devices;
      Common.on('changeDevices', () => {
        this.devices = Common.devices;
      });
      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
      });
      this.hueLights = Common.hueLights;
      Common.on('changeHueBridges', () => {
        this.hueLights = Common.hueLights;
      });
    },
    methods: {
      SelectModule(e) {
        if(!e.target.dataset.enable) return;
        Socket.emit('command', {
          type: 'command',
          device: e.target.dataset.device,
          command: this.command.replace(/[\r\n]+/g, ' '),
        });
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
    components: {
      dropdown: VueStrap.dropdown,
    },
  };
</script>

<style scoped>
  .module-list, .moduleLabel {
    font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
    font-size:14px;
    text-align: left;
  }

  .module-list li a {
    padding: 3px 10px;
  }

  .command-panel {
    height:40vh;
  }

  .event-panel {
    height:40vh;
  }

  .device-panel {
    height:40vh;
  }

  .status-panel {
    height:40vh;
  }

  .queue-panel {
    height:40vh;
  }

  table.device-table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
  }
  table.device-table tr th, table.device-table tr td {
      font-size:12px;
      font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
  }

  table.device-table tr th {
      background: #E6EAFF;
  }

  table.status-table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
  }
  table.status-table tr th,table.status-table tr td {
      font-size: 12px;
      font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
  }
  table.status-table tr th {
      background: #E6EAFF;
  }

  table.queue-table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
  }
  table.queue-table tr th,table.queue-table tr td {
      font-size: 12px;
      font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
  }
  table.queue-table tr th {
      background: #E6EAFF;
  }

  table.controllerLog-table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
  }
  table.controllerLog-table tr th,table.controllerLog-table tr td {
      font-size: 12px;
      font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
  }
  table.controllerLog-table tr th {
      background: #E6EAFF;
  }
</style>

