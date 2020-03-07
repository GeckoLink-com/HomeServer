<template>
  <nav class="navbar">
    <div class="navbar-header">
      <button v-if="!$slots.collapse" type="button" class="navbar-toggle" @click="ToggleCollapse">
        <span class="icon-bar" />
        <span class="icon-bar" />
        <span class="icon-bar" />
      </button>
      <slot name="brand" />
    </div>
    <ul class="navbar-nav" :class="{collapse:collapsed}">
      <slot />
    </ul>
  </nav>
</template>

<script>
  export default {
    data() {
      return {
        collapsed: true,
      };
    },
    mounted() {
      document.addEventListener('click', this.Blur.bind(this));
      document.addEventListener('touchstart', this.Blur.bind(this));

      const els = this.$el.querySelectorAll('li');
      for(const el of els) {
        if(el.classList.contains('dropdown')) continue;
        el.addEventListener('click', this.SelectPage.bind(this), true);
        el.addEventListener('touchstart', this.SelectPage.bind(this), true);
      }
    },
    updated() {
      const els = this.$el.querySelectorAll('li');
      for(const el of els) {
        if(!el.attributes.disabled) {
          let pel = el.parentElement;
          do {
            if(pel.attributes.disabled) break;
            pel = pel.parentElement;
          } while((pel !== this.$el) && (pel !== document));
          if(pel === this.$el) {
            el.classList.remove('disabled');
            continue;
          }
        }
        el.classList.add('disabled');
      }
   },
    methods: {
      ToggleCollapse(e) {
        console.log('Toggle');
        e && e.preventDefault();
        this.collapsed = !this.collapsed;
      },
      Blur(e) {
        let el = e.target;
        if(el.classList.contains('disabled')) return;
        do {
          if(!el) return;
          if(el.classList.contains('navbar-toggle')) return;
          if(el.classList.contains('navbar-nav')) {
            return setTimeout(() => { this.collapsed = true; }, 200);
          }
          el = el.parentElement;
        } while(el !== document.body);
        this.collapsed = true;
      },
      SelectPage(ev) {
        if(ev.target.classList.contains('disabled')) {
          ev.preventDefault();
        } else {
          this.collapsed = true;
          this.$emit('page', { to: ev.target.dataset.to });
        }
      },
    },
  };
</script>

<style scoped>
  /* for mobile device */ 

  .navbar {
    float: right;
    position: fixed;
    z-index: 1000;
    width: 100vw;
    right: 0;
    left: 0;
    top: 0px;
    border-width: 0;
    color: rgba(93,93,93,0);
    background-color: rgba(255,255,255,0);
    border-color: #e7e7e7;
    display: inline-block;
  }

  .navbar-toggle {
    position: relative;
    float: right;
    padding: 9px 10px;
    margin-top: 8px;
    margin-right: 15px;
    margin-bottom: 8px;
    background-color: transparent;
    background-image: none;
    border: 1px #ddd;
    border-radius: 4px;
    border: 0;
    display: block;
  }

  .navbar-toggle:focus, .navbar-toggle:hover {
    background-color: #ddd;
  }

  .navbar-toggle .icon-bar {
    display: block;
    width: 22px;
    height: 2px;
    border-radius: 1px;
    background-color: #888;
  }

  .navbar-toggle .icon-bar + .icon-bar {
    margin-top: 4px;
  }

  .navbar > .navbar-header {
    margin-left: 0;
    margin-right: 0;
  }

  .navbar .navbar-header img {
    margin: 0.8% 0 0.5% 0;
    width: 24vw;
    max-width: 240px;
    min-width: 150px;
    padding-left: 1vw;
    display: inline-block;
  }

  .navbar .navbar-nav {
    float: right;
    background-color: rgba(255,255,255,0.8);
    font-size: 1.6em;
    padding: 0;
    margin: 0 0.5em;
    box-shadow: none;
    border-style: none;
    max-height: none;
    list-style: none;
    vertical-align: middle;
    cursor: default;
    line-height: 1.6em;
    display: block;
  }

  .navbar .navbar-nav.collapse {
    display: none;
  }

  .navbar-nav >>> li {
    font-weight: unset;
    font-size: 1em;
    line-height: 1.6em;
    color: rgb(140, 140, 140);
    padding: 0;
    text-align: left;
    background-color: rgba(0, 0, 0, 0);
    display: list-item;
  }

  .navbar-nav >>> li:hover {
    color: black;
    background-color: rgba(0, 0, 0, 0);
  }

  .navbar-nav >>> li.disabled {
    color: #ccc;
  }

  .navbar-nav >>> .dropdown > :not(ul) {
    display: none;
  }

  .navbar-nav >>> li.no-mobile {
    display: none;
  }

  .navbar-nav >>> li.disabled:hover,
  .navbar-nav >>> li.disabled:focus {
    color: #ccc;
    text-decoration: none;
    cursor: not-allowed;
  }

  /* for PC */
  @media only screen
         and (min-width: 768px) {
    .navbar {
      background-color: white;
      padding-right: 0;
      padding-left: 0;
      max-height: 340px;
      border-radius: 0;
   }

    .navbar-header {
      float: left;
    }

    .navbar-toggle {
      display: none;
    }

    .navbar .navbar-nav {
      border-top: 0;
      background-color: rgba(0, 0, 0, 0);
      font-size: 1.2em;
      line-height: 2.0em;
      margin: 0.5vh 2vw 0 5vw;
      width: 68vw;
      display: flex;
      float: left;
      justify-content: space-between;
    }

    .navbar .navbar-nav.collapse {
      display: flex;
    }

    .navbar >>> li {
      font-size: 1.2em;
      margin: 20px 0.3% 15px 0.3%;
      text-align: center;
    }

    .navbar >>> .dropdown > :not(ul) {
      display: inline-block;
    }

    .navbar-nav >>> li.no-mobile {
      display: list-item;
    }
  }
</style>
