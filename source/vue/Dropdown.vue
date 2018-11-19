<template>
  <div is="li" class="dropdown" >
    <slot name="button">
      <div class="dropdown-toggle">
        {{ text }}
      </div>
    </slot>
    <span class="caret"/>
    <slot name="dropdown-menu">
      <ul class="dropdown-menu">
        <slot/>
      </ul>
    </slot>
  </div>
</template>

<script>
export default {
  props: {
    text: {
      type: String,
      default: null,
    },
  },
};
</script>

<style scoped>
  /* for mobile device */
  .dropdown {
    position: relative;
  }

  .dropdown-menu {
    display: list-item;
    text-align: center;
    line-height: 1.6em;
    font-size: 1.0em;
    margin: 0;
    padding: 0;
    background-color: rgba(0, 0, 0, 0);
    box-shadow: none;
    border-style: none;
    position: static;
    top: 100%;
    float: none;
    list-style: none;
    z-index: auto;
  }

  .dropdown-toggle {
    display: none;
    text-align: center;
    line-height: 2.0em;
    margin: 0;
    padding: 0;
  }

  .dropdown >>> li {
    font-weight: unset;
    font-size: 1.0em;
    line-height: 1.6em;
    color: rgb(140, 140, 140);
    padding: 0;
    text-align: left;
    background-color: rgba(0, 0, 0, 0);
  }

  .dropdown >>> li:hover {
    color: black;
    background-color: rgba(0, 0, 0, 0);
  }

  .caret {
    display: inline-block;
    width: 0;
    height: 0;
    margin-left: 0.2vw;
    vertical-align: middle;
    border-top: 0.4vw solid;
    border-right: 0.4vw solid transparent;
    border-left: 0.4vw solid transparent;
  }

  /* for PC */
  @media only screen
         and (min-width: 768px) {

    .dropdown-menu {
      display: none;
      text-align: left;
      position: absolute;
      top:100%;
      left: 0;
      box-shadow: 0 6px 12px 0 rgba(0,0,0,.2);
      background-color: rgba(255,255,255,0.9);
    }

    .dropdown-menu li {
      margin: 0 0.5em 0 0.5em;
      width: 18vw;
      text-align: left;
    }

    .dropdown:hover:not(.disabled) .dropdown-menu {
      display: inline-block;
    }

    .dropdown-toggle {
      display: block;
      line-height: 1.6em;
    }
  }
</style>
