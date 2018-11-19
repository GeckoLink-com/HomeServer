<template>
  <article class="contents">
    <div class="brand">
      <img src="../images/GeckoLogo.png" class="logo">
    </div>
    <div class="sign-in">
      <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="30%" label-position="left">
        <el-form-item label="アカウント" prop="account">
          <el-input type="text" name="account" v-model="ruleForm.account" />
        </el-form-item>
        <el-form-item label="パスワード" prop="password">
          <el-input type="password" name="password" v-model="ruleForm.password" />
        </el-form-item>
        <div v-if="alert" class="form_item_error">
          アカウントもしくはパスワードが正しくありません。
        </div>
        <el-button type="primary" class="pull-right" @click="Submit">認証</el-button>
      </el-form>
    </div>
  </article>
</template>

<script>
  import { Form, FormItem, Input, Button } from 'element-ui';
  import 'element-ui/lib/theme-chalk/form.css';
  import 'element-ui/lib/theme-chalk/input.css';
  import 'element-ui/lib/theme-chalk/button.css';
  import JsSHA from 'jssha';

  export default {
    components: {
      ElForm: Form,
      ElFormItem: FormItem,
      ElInput: Input,
      ElButton: Button,
    },
    data() {
      return {
        alert: false,
        ruleForm: {
          account: '',
          password: '',
        },
        rules: {
          account: [
            { required: true, message: 'アカウントを入力してください', trigger: [ 'blur', 'change' ] },
          ],
          password: [
            { required: true, message: 'パスワードを入力してください', trigger: [ 'blur', 'change' ] },
          ],
        },
      };
    },
    methods: {
      Submit() {
        Socket.emit('requestNonce', (nonce) => {
          const password = this.SHA256(this.ruleForm.account + this.ruleForm.password);
          const digest = this.SHA256(password + nonce);
          Socket.emit('login', { account: this.ruleForm.account, digest: digest }, (res) => {
            if(!res) {
              this.alert = true;
            } else {
              this.alert = false;
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

  .sign-in {
    margin: 30vh 20vw;
  }
</style>



