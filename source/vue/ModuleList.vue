<template>
  <div v-show="display" class="container-fluid tab-panel" @click="selectedDevice=null">
    <div class="col-sm-3 col-md-3">
      <br>
      <h4>子機一覧</h4>
      <br>
      <div class="module-image">
        <img src="../images/HB-6.png" width="200px" />
      </div>
    </div>
    <div class="col-sm-7 col-md-7 scrollable">
      <br>
      <table class="table module-table" v-show="devices && (devices.length > 0)">
        <thead>
          <tr>
            <th class="col-md-3">name</th>
            <th class="col-md-2">module</th>
            <th class="col-md-1">type</th>
            <th class="col-md-2">version</th>
            <th class="col-md-1">power</th>
            <th class="col-md-3">status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev of actualDevices" @click.stop="selectedDevice=dev.device" :class="{success:(selectedDevice==dev.device)}">
            <td>{{dev.deviceName?dev.deviceName:'-'}}</td>
            <td>{{dev.device}}</td>
            <td>{{dev.type?dev.type:'-'}}</td>
            <td>{{dev.version?dev.version:'-'}}</td>
            <td>{{dev.voltage?dev.voltage:'-'}}</td>
            <td v-if="dev.fwupdateSeq == dev.fwupdateNum">
              {{dev.state}}
              <button v-show="(selectedDevice==dev.device)&&(dev.state=='dead')" class="btn btn-xs btn-danger delete-btn pull-right" @click.stop="Delete(dev.device)">
                -
              </button>
              <button v-show="(selectedDevice==dev.device)&&(dev.state!='dead')&&(dev.type=='HA/FC')" class="btn btn-xs btn-danger delete-btn pull-right" @click.stop="Update(dev.device)">
                update
              </button>
            </td>
            <td v-if="dev.fwupdateSeq != dev.fwupdateNum">
              <progressbar :now="dev.fwupdateSeq * 100 / dev.fwupdateNum" type="primary" :striped="true" :animated="true" class="module-progress"></progressbar>
            </td>
          </tr>
        </tbody>
      </table>
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
        devices: [],
        alias: {},
        selectedDevice: null,
      };
    },
    computed: {
      actualDevices() {
        return this.devices.filter((dev) => {
          return dev.device !== 'pairing';
        });
      },
    },
    mounted() {
      /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
      this.devices = Common.devices;
      Common.on('changeDevices', () => {
        this.devices = Common.devices;
      });
      this.alias = Common.alias;
      Common.on('changeAlias', () => {
        this.alias = Common.alias;
      });
    },
    methods: {
      Delete(device) {
        for(const i in this.devices) {
          if(this.devices[i].device === device) {
            this.devices.splice(i, 1);
            Common.emit('changeDevices', this);
            Socket.emit('command',
              { type: 'command', device: device, command: 'rmdev' });
            break;
          }
        }
        this.selectedDevice = null;
        this.$delete(this.alias, device);
        Common.emit('changeAlias', this);
      },
      Update(device) {
        Socket.emit('command',
          { type: 'command', device: device, command: 'update' });
        this.selectedDevice = null;
      },
    },
    components: {
      progressbar: VueStrap.progressbar,
    },
  };
</script>

<style scoped>

  table.module-table {
      width: 100%;
      border-top: 1px solid #CCC;
      border-left: 1px solid #CCC;
      border-spacing:0;
  }

  table.module-table tr th, table.module-table tr td {
      font-size:14px;
      font-family: 'Monaco', 'NotoSansMonoCJKjp', monospace;
      border-bottom: 1px solid #CCC;
      border-right: 1px solid #CCC;
      padding: 0px 5px;
      height: 23px;
  }

  table.module-table tr th {
      background: #E6EAFF;
  }

  .module-progress {
      height: 10px;
      margin-top: 5px;
  }
</style>

