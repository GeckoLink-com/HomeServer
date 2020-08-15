module.exports = function(RED) {

  function ElapsedTime(config) {
    RED.nodes.createNode(this, config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    this.rules = config.rules || [{sel:'gt', val:''},{sel:'', val:''}];
    this.elapsedTime = config.elapsedTime;
    this.timer = null;
    this.sendState = false;
    
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.eventListener = (_caller) => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      const stat = homeServer.status[`${this.deviceName}:${this.func}`];
      if(!stat) return;
      
      let s = false;
      if(homeServer.IsAnalogFunc(this.deviceName, this.func)) {
        s = ((this.rules[0].sel == 'lt') && (parseFloat(stat.value) < parseFloat(this.rules[0].val))) ||
            ((this.rules[0].sel == 'lte') && (parseFloat(stat.value) <= parseFloat(this.rules[0].val))) ||
            ((this.rules[0].sel == 'gt') && (parseFloat(stat.value) > parseFloat(this.rules[0].val))) ||
            ((this.rules[0].sel == 'gte') && (parseFloat(stat.value) >= parseFloat(this.rules[0].val)));
        if(((this.rules[0].sel == 'gt') || (this.rules[0].sel == 'gte')) &&
           (this.rules[1].sel != '')) {
          s = s &&
            (((this.rules[1].sel == 'lt') && (parseFloat(stat.value) < parseFloat(this.rules[1].val))) ||
            ((this.rules[1].sel == 'lte') && (parseFloat(stat.value) <= parseFloat(this.rules[1].val))));
        }
      } else {
        s = this.rules[0].val == stat.valueName;
      }
      if(!s) this.sendState = false;

      if(s && !this.timer && !this.sendState) {
        const msg = {'payload': {
          type: stat.type,
          device: stat.deviceName,
          func: stat.func,
          funcName: stat.funcName,
          value: stat.value,
          unit: stat.unit,
          valueName: stat.valueName,
        }};
        this.timer = setTimeout((msg) => {
          this.send([msg]);
          this.timer = null;
          this.sendState = true;
        }, this.elapsedTime * 1000, msg);
      }
      if(!s && this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    };
    RED.settings.functionGlobalContext.homeServer.on('statusNotify', this.eventListener);
  }
  RED.nodes.registerType('gecko elapsed time', ElapsedTime);
  
  ElapsedTime.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.off('statusNotify', this.eventListener);
  }

  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
