module.exports = function(RED) {

  function Status(config) {
    RED.nodes.createNode(this,config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    
    this.on("input", (msg) => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      homeServer.emit('changeValue', this, {
        deviceName: this.deviceName,
        func: this.func,
        value: msg.payload.value,
      });
    });
  }
  RED.nodes.registerType('gecko notify',Status);
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
