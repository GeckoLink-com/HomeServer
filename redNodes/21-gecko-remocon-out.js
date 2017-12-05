module.exports = function(RED) {

  function Command(config) {
    RED.nodes.createNode(this,config);
    this.deviceName = config.deviceName;
    this.remoconGroup = config.remoconGroup;
    this.remoconCode = config.remoconCode;

    this.on("input", () => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      homeServer.emit('sendControllerCommand', this, {deviceName: this.deviceName, command: this.remoconCode, id:this.id});
    });

    this.eventListener = (caller, msg) => {
      if(msg.data[0].origin.id == this.id) {
        this.send({'payload': {
          device: this.deviceName,
          command: msg.data[0].origin.command,
          status: msg.data[0].status,
        }});
      }
    };
    RED.settings.functionGlobalContext.homeServer.on('response', this.eventListener);
  }
  RED.nodes.registerType('gecko remocon out',Command);
  
  Command.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.removeListener('response', this.eventListener);
  }
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
