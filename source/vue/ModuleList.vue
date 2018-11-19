<template>
  <el-container @click.native="ClearSelect">
    <el-aside :width="$root.$el.clientWidth > 768 ? '25%' : '90%'">
      <h4>子機一覧</h4>
      <br>
      <div class="module-image no-mobile" >
        <img src="../images/HB-6.png" alt="GL-1100" width="90%" >
      </div>
    </el-aside>
    <el-main>
      <table class="table module-table" v-show="devices && (devices.length > 0)">
        <thead>
          <tr>
            <th width="25%">name</th>
            <th width="16%">module</th>
            <th width="9%">type</th>
            <th width="16%">version</th>
            <th width="9%">power</th>
            <th width="25%">status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev of actualDevices" :key="'mlist-actualDevices' + dev.device" :class="{success:(selectedDevice==dev.device)}" @click.stop="selectedDevice=dev.device">
            <td>{{ dev.deviceName?dev.deviceName:'-' }}</td>
            <td>{{ dev.device }}</td>
            <td>{{ dev.type?dev.type:'-' }}</td>
            <td>{{ dev.version?dev.version:'-' }}</td>
            <td>{{ dev.voltage?dev.voltage:'-' }}</td>
            <td v-if="dev.fwupdateSeq == dev.fwupdateNum">
              {{ dev.state }}
              <el-button v-if="(selectedDevice==dev.device)&&(dev.state=='dead')" type="danger" icon="el-icon-delete" class="module-button" @click.stop="Delete(dev.device)" />
              <el-button v-if="(selectedDevice==dev.device)&&(dev.state!='dead')&&(dev.type=='HA/FC')" type="danger" class="module-button" @click.stop="Update(dev.device)">
                update
              </el-button>
            </td>
            <td v-if="dev.fwupdateSeq != dev.fwupdateNum">
              <el-progress :show-text="false" :stroke-width="22" :percentage="dev.fwupdateSeq * 100 / dev.fwupdateNum" color="#e6a23c" class="progress-striped" />
            </td>
          </tr>
        </tbody>
      </table>
    </el-main>
  </el-container>
</template>

<script>
  import { Progress } from 'element-ui';
  import 'element-ui/lib/theme-chalk/progress.css';

  export default {
    components: {
      ElProgress: Progress,
    },
    props: {
      display: {
        type: Boolean,
        default: false,
      },
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
      ClearSelect() {
        this.selectedDevice = null;
      },
    },
  };
</script>

<style scoped>

  table.module-table tr th, table.module-table tr td {
    height: 23px;
  }

  .module-button {
    float: right;
    padding: 4px 15px;
  }
</style>

