<template>
  <iframe v-if="initialized()" v-show="display" src="/red/" id="node-red" scrolling="no" frameborder="no" />
</template>

<script>
  export default {
    props: {
      display: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        initializeState: false,
      };
    },
    methods: {
      initialized() {
        if(this.display === true) this.initializeState = true;
        return this.initializeState;
      },
    },
  };
</script>

<style scoped>
  #node-red {
    position: fixed;
    top: 80px;
    left: 1vw;
    height: 89vh;
    width: 98vw;
  }
</style>
