<template>
  <div class="toast-container">
    <transition-group appear name="toast-fade" tag="div">
      <div v-for="msg of messages" :key="msg.key" class="toast-fade-item alert" :class="'alert-'+msg.type" style="width: 100%" role="alert">
        <h5 class="toast-text" v-html="msg.text"/>
      </div>
    </transition-group>
  </div>
</template>

<script>
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
    width: 24vw;
    bottom: 1vh;
    opacity: 0.8;
  }

  .toast-text {
    white-space: normal;
    font-weight: 300;
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

  .alert {
    font-size: 0.9em;
    font-weight: bold;
    padding: 4px;
    margin: 4px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .alert h5 {
    margin: 0 4px;
  }

  .alert-success {
    color: #3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
  }
  .alert-success hr {
    border-top-color: #c9e2b3;
  }
  .alert-info {
    color: #31708f;
    background-color: #d9edf7;
    border-color: #bce8f1;
  }
  .alert-info hr {
    border-top-color: #a6e1ec;
  }
  .alert-warning {
    color: #8a6d3b;
    background-color: #fcf8e3;
    border-color: #faebcc;
  }
  .alert-warning hr {
    border-top-color: #f7e1b5;
  }
  .alert-danger {
    color: #a94442;
    background-color: #f2dede;
    border-color: #ebccd1;
  }
  .alert-danger hr {
    border-top-color: #e4b9c0;
  }
</style>

