<template>
  <article class="contents">
    <div class="brand">
      <img src="../images/GeckoLogo.png" class="logo">
    </div>
    <p class="vertical-space1"/>
    <div class="col-md-8 col-md-offset-3">
      <div class="row">
        <div class="col-md-4">
          <H5>アカウント</h5>
        </div>
        <div class="col-md-6">
          <input type="text" name="account" v-model="account">
        </div>
      </div>
      <div class="row">
        <div class="col-md-4">
          <H5>パスワード</h5>
        </div>
        <div class="col-md-6">
          <input type="password" name="password" v-model="password">
        </div>
      </div>
      <div class="row">
        <div class="col-md-8 col-md-offset-2">
          <H5>{{ message }}</h5>
        </div>
      </div>
      <div class="row">
        <div class="col-md-10">
          <div class="pull-right">
            <button class="btn btn-sm btn-primary" @click="Submit">認証</button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script>
  import JsSHA from 'jssha';

  export default {
    data() {
      return {
        account: '',
        password: '',
        message: '',
      };
    },
    methods: {
      Submit() {
        Socket.emit('requestNonce', (nonce) => {
          const password = this.SHA256(this.account + this.password);
          const digest = this.SHA256(password + nonce);
          Socket.emit('login', { account: this.account, digest: digest }, (res) => {
            if(!res) {
              this.message = 'アカウントもしくはパスワードが正しくありません。';
            } else {
              this.message = '';
              setTimeout(window.location.reload.bind(window.location), 200);
            }
          });
        });
      },
      SHA256(data) {
        const sha256 = new JsSHA('SHA-256', 'TEXT');
        sha256.update(data);
        return sha256.getHash('HEX');
      },
    },
  };
</script>

<style scoped>
  .logo {
    margin: 0.8% 1vw 0.5% 1vw;
    width: 18vw;
    max-width: 200px;
    min-width: 150px;
    display: inline-block;
  }

  input {
    width: 80%;
  }
</style>



