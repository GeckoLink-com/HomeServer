<template>
  <div v-show="display" class="container-fluid tab-panel">
    <div class="col-sm-3 col-md-3">
      <br>
      <h4>ペアリング</h4>
      <br>
      <div class="module-image">
        <img src="../images/HB-6.png" width="200px" />
      </div>
    </div>
    <div class="col-sm-7 col-md-7">
      <br>
      <div class="row vertical-space2">
        <div class="col-md-8">
        <div class="progress">
          <progressbar :now="progress" type="primary" :striped="progressing" :animated="progressing"></progressbar>
        </div>
        </div>
        <div class="pull-right">
          <button class="btn btn-primary" type="button" :disabled="progressing" @click="ExecutePairing">モジュール書き込み</button>
        </div>
      </div>
      <p>
      <h5 class="error" v-if="error!=''">
        子機のエラーが発生しています。<br>
        {{error}}
      </h5>
      <h4>{{moduleLabel}}</h4>
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
        progress: 0,
        moduleLabel: '',
        error: '',
        option: 0xc0000000,
        param: 0,
        configCommand: '',
        newDevice: { name: '', device: '' },
      };
    },
    computed: {
      progressing() {
        return (this.progress !== 0) && (this.progress !== 100);
      },
    },
    methods: {
      ExecutePairing() {
        Common.emit('toastr_clear', this);
        this.error = '';
        Common.emit('toastr_info', this, 'モジュール接続開始');
        this.progress = 10;

        this.configCommand = ('config ' + this.option.toString(16) + ' F ' + this.param).trim();
        Socket.emit('command',
          { type: 'command', device: '0', command: this.configCommand });
      },
    },
    components: {
      progressbar: VueStrap.progressbar,
    },
    mounted() {
      Socket.on('response', (msg) => {
        if((msg.data[0].command !== this.configCommand) &&
           (msg.data[0].command !== 'moduleauth')) return;

        if(msg.data[0].status === 'error') {
          Common.emit('toastr_error', this, msg.data[0].message);
          this.error = msg.data[0].message;
          this.progress = 0;
          return;
        }

        if(msg.data[0].status === 'ok') {
          Common.emit('toastr_success', this, 'ペアリング完了');
          this.progress = 100;
          this.moduleLabel = this.newDevice.name + ':' + this.newDevice.device;
          Common.emit('changeModule', this, this.newDevice.device, this.newDevice.name, this.option.toString(16), this.param.toString(16), 'HA/FC');
        }

        const message = msg.data[0].message;
        if(message.search(/Start module firmware update/) >= 0) {
          Common.emit('toastr_info', this, 'ファームウェア更新開始');
          this.progress = 20;
          setTimeout(() => {
            Common.emit('toastr_info', this, 'ファームウェア更新中');
            this.progress = 30;
          }, 5000);
          return;
        }

        if(message.search(/HA module XBee Info/) >= 0) {
          const str = message.match(/SerialNumber :.*/);
          if(str) {
            const dev = str[0].replace(/^.*-/, '');
            if(dev) {
              let c = 0;
              /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
              while(true) {
                const name = 'new_device' + c;
                let f = false;
                for(const id in Common.alias) {
                  if(Common.alias[id].name === name) {
                    f = true;
                    break;
                  }
                }
                if(!f) {
                  Common.alias[dev] = { name: name };
                  this.newDevice = { name: name, device: dev };
                  Common.emit('changeAlias', this);
                  break;
                }
                c++;
              }
            }
          }
          Common.emit('toastr_info', this, 'ファームウェア更新完了');
          this.progress = 35;
          return;
        }

        if(message.search(/HA module XBee update/) >= 0) {
          Common.emit('toastr_info', this, 'XBee更新開始');
          this.progress = 40;
          setTimeout(() => {
            Common.emit('toastr_info', this, 'XBee更新中');
            this.progress = 45;
            setTimeout(() => {
              Common.emit('toastr_info', this, 'XBee更新中');
              this.progress = 50;
            }, 10000);
          }, 10000);
          return;
        }

        if(message.search(/Wait Coordinator/) >= 0) {
          const n = parseInt(message.replace(/^.*bring up /, ''));
          if(n === 0) {
            Common.emit('toastr_info', this, '無線接続開始');
          }
          this.progress = 60 + n;
          return;
        }

        if(message.search(/Bootup HA-Micro/) >= 0) {
          Common.emit('toastr_info', this, 'マイコン起動');
          this.progress = 85;
          return;
        }

        if(message.search(/PairingSequence/) >= 0) {
          Common.emit('toastr_info', this, 'ペアリング中');
          this.progress = 90;
          return;
        }

        if(message.search(/Start validate module/) >= 0) {
          Common.emit('toastr_info', this, 'モジュール動作確認');
          this.progress = 95;
          return;
        }
      });

      Common.on('changeDevices', () => {
        for(const dev of Common.devices) {
          if(dev.device === 'pairing') {
            if(dev.state !== 'connect') {
              this.progress = 0;
              this.moduleLabel = '';
            }
            break;
          }
        }
      });
    },
  };
</script>

<style scoped>
  .vertical-space2 {
    margin-top: 10vh;
  }

.progress {
  margin: 2%;
}
</style>

