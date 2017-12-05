<template>
  <button-group :value="value">
    <radio :value="value" :disabled="disabled" v-for="button in buttons" button
      :selected-value="button.val"
      class="btn-xs btn-xs-wide"
      @input="BtnClick"
      :type="(value==button.val)?'primary':'default'"
      :key="button.label"
    >{{button.label}}</radio>
  </button-group>
</template>

<script>
  import { radio, buttonGroup } from 'vue-strap';

  export default {
    props: ['value', 'buttons', 'disabled'],
    methods: {
      BtnClick(val) {
        this.$emit('input', val);
      },
    },
    components: {
      radio: radio,
      buttonGroup: buttonGroup,
    },
  };
</script>
    
<style scoped>
  .btn-xs-wide {
    padding: 1px 7px;
  }

  .btn-sw {
    color: #dcdcdc;
    background-color: #dcdcdc;
    border-color: #ccc;
  }

  .btn-sw:hover, .btn-sw.hover {
    color: #808080;
    background-color: #dcdcdc;
    border-color: #ccc;
  }

  .btn-sw:focus, .btn-sw.focus {
    color: #c0c0c0;
    background-color: #c0c0c0;
    border-color: #8c8c8c;
  }

  .btn-sw:active, .btn-sw.active {
    color: white;
    background-color: #337ab7;
    border-color: #2e6da4;
  }

  .btn-sw.disabled, .btn-sw.disabled:focus {
    color: #e0e0e0;
    background-color: white;
    border-color: #ccc;
  }

  .btn-single {
    color: 3c763d;
    background-color: #cfe0c8;
    border-color: #d6e9c6;
  }

  .btn-single:hover, .btn-single.hover {
    color: 3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
  }

  .btn-single:focus, .btn-single.focus {
    color: 3c763d;
    background-color: #dff0d8;
    border-color: #d6e9c6;
  }

  .btn-single:active, .btn-single.active {
    color: 3c763d;
    background-color: #bfd0b8;
    border-color: #d6e9c6;
  }
</style>

