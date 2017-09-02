module.exports = function(RED) {

  function Switch(config) {
    RED.nodes.createNode(this, config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    this.rules = config.rules || [{sel:'lt', val:'', enable:true},{sel:null, val:'', enable:true},{sel:'lt', val:'', enable:true}];
    this.outputs = config.outputs;

    this.on('input', (msg) => {
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
        for(let i = 0; i < 3; i++) {
          s[i] = this.rules[i].enable && (this.rules[i].val == stat.valueName);
        }
      }
      let outMsg = [];
      for(let i = 0; i < 3; i++) {
        if(this.rules[i].enable) outMsg.push(s[i]?msg:null);
      }
      this.send(outMsg);
    });
  }
  RED.nodes.registerType('gecko switch',Switch);
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
