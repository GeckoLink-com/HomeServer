<template>
  <div class="toast-container">
    <transition-group appear name="toast-fade" tag="div">
      <alert class="toast-fade-item" v-for="msg of messages" :type="msg.type" :key="msg.key" width="100%">
        <h5 class="toast-text" v-html="msg.text"/>
      </alert>
    </transition-group>
  </div>
</template>

<script>
  import { alert } from 'vue-strap';

  export default {
    components: {
      alert,
    },
    data() {
      return {
        messages: [],
        defaultTimeout: 5000,
        defaultType: 'info',
        key: 1,
      };
    },
    mounted() {
      Common.on('toastr_success', (caller, msg, timeout) => {
        this.add(msg, 'success', timeout);
      });
      Common.on('toastr_warning', (caller, msg, timeout) => {
        this.add(msg, 'warning', timeout);
      });
      Common.on('toastr_info', (caller, msg, timeout) => {
        this.add(msg, 'info', timeout);
      });
      Common.on('toastr_error', (caller, msg, timeout) => {
        this.add(msg, 'danger', timeout);
      });
      Common.on('toastr_clear', () => {
        this.messages = [];
      });
      Common.on('toastr_timeout', (caller, timeout) => {
        this.defaultTimeout = timeout;
      });
    },
    methods: {
      add(msg, type, timeout) {
        if(!type) type = this.defaultType;
        if(timeout == null) timeout = this.defaultTimeout;
        const data = {
          text: msg,
          timeout: timeout,
          type: type,
          key: this.key++,
        };
        this.messages.unshift(data);
        if(this.messages.length > 4) this.messages.pop();
        if(timeout !== 0) {
          setTimeout((d) => {
            for(const i in this.messages) {
              if(this.messages[i] === d) {
                this.messages.splice(i, 1);
                break;
              }
            }
          }, timeout, data);
        }
      },
    },
  };
</script>

<style scoped>
  .toast-container {
    position: fixed;
    left: 0.5vw;
    width: 33vw;
    bottom: 1vh;
    opacity: 0.8;
  }

  .toast-text {
    white-space: normal;
  }

  .toast-fade-item {
    transition: all 1s;
  }

  .toast-fade-move {
    transition: transform 1s;
  }

  .toast-fade-enter, .toast-fade-leave-active {
    opacity: 0;
    transform: translateY(30px);
  }

  .toast-fade-leave-active {
    position: absolute;
  }
</style>

