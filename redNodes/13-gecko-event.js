module.exports = function(RED) {

  function Event(config) {
    RED.nodes.createNode(this, config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    this.rules = config.rules || [{sel:'gt', val:'', enable:true},{sel:'gt', val:'', enable:true},{sel:'gt', val:'', enable:true}];
    this.outputs = config.outputs;

    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.eventListener = (_caller) => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      let status = homeServer.status;
      let stat = null;
      for(let st of status) {
        if((st.deviceName == this.deviceName) && (st.func == this.func)) {
          stat = st;
          break;
        }
      }
      if(!stat) return;
      let s = [];
      if(homeServer.IsAnalogFunc(this.deviceName, this.func)) {
        s[0] = this.rules[0].enable &&
          (((this.rules[0].sel == 'lt') && (parseFloat(stat.value) < parseFloat(this.rules[0].val))) ||
           ((this.rules[0].sel == 'lte') && (parseFloat(stat.value) <= parseFloat(this.rules[0].val))));
        s[2] = this.rules[2].enable &&
          (((this.rules[2].sel == 'lt') && (parseFloat(this.rules[2].val) < parseFloat(stat.value))) ||
           ((this.rules[2].sel == 'lte') && (parseFloat(this.rules[2].val) <= parseFloat(stat.value))));
        s[1] = !s[0] && !s[2];
      } else {
        let f = true;
        if(this.func == 'sw') {
          if((stat.valueName == 'opening') &&
             (this.previousValueName != 'close')) f = false;
          if((stat.valueName == 'closing') &&
             (this.previousValueName != 'open')) f = false;
        }
        for(let i in this.rules) {
          s[i] = f && this.rules[i].enable && (this.rules[i].val == stat.valueName);
        }
        this.previousValueName = stat.valueName;
      }
      let outMsg = [];
      const msg = {'payload': {
        type: stat.type,
        device: stat.deviceName,
        func: stat.func,
        funcName: stat.funcName,
        value: stat.value,
        unit: stat.unit,
        valueName: stat.valueName,
      }};
      let out = false;
      if(homeServer.IsAnalogFunc(this.deviceName, this.func) &&
        !this.rules[0].enable && this.rules[1].enable && !this.rules[2].ebable) out = true;
      if(!this.previousState) this.previousState = [];
      for(let i in this.rules) {
        if(this.rules[i].enable) {
          if((this.previousState[i] != null) && (this.previousState[i] != s[i])) out = true;
          outMsg.push(s[i]?msg:null);
          this.previousState[i] = s[i];
        }
      }
      if(out) this.send(outMsg);
    };
    RED.settings.functionGlobalContext.homeServer.on('statusNotify', this.eventListener);
  }
  RED.nodes.registerType('gecko event',Event);
  
  Event.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.removeListener('statusNotify', this.eventListener);
  }
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
