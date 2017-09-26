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
  import { radio, buttonGroup } from 'vue-strap'

  export default {
    props: ['value', 'buttons', 'disabled'],
    methods: {
      BtnClick: function (val) {
        this.$emit('input', val);
      },
    },
    components: {
      'radio': radio,
      'button-group': buttonGroup,
    },
  }
</script>
    
