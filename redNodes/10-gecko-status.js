module.exports = function(RED) {

  function Status(config) {
    RED.nodes.createNode(this,config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    
    /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
    this.eventListener = (_caller) => {
      let status = RED.settings.functionGlobalContext.homeServer.status;
      for(let st of status) {
        if(((st.deviceName == this.deviceName) || (this.deviceName == 'all')) &&
           ((st.func == this.func) || (this.func == 'all')))  {
          this.send({'payload': {
            type: st.type,
            device: st.deviceName,
            func: st.func,
            funcName: st.funcName,
            value: st.value,
            unit: st.unit,
            valueName: st.valueName,
          }});
        }
      }
    };
    RED.settings.functionGlobalContext.homeServer.on('statusNotify', this.eventListener);
  }
  RED.nodes.registerType('gecko status',Status);
  
  Status.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.off('statusNotify', this.eventListener);
  }
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
