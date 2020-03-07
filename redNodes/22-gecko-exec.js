module.exports = function(RED) {

  function Command(config) {
    RED.nodes.createNode(this,config);

    this.on("input", (msg) => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      homeServer.emit('sendControllerCommand', this, {deviceName: msg.payload.deviceName, command: msg.payload.func + (msg.payload.mode?(' ' + msg.payload.mode):''), id:this.id, func:msg.payload.func, mode:msg.payload.mode});
    });

    this.eventListener = (caller, msg) => {
      if(msg.data[0].origin.id == this.id) {
        this.send({'payload': {
          device: msg.data[0].origin.deviceName,
          command: msg.data[0].origin.command,
          status: msg.data[0].status,
          result: msg.data[0].result,
        }});
      }
    };
    RED.settings.functionGlobalContext.homeServer.on('response', this.eventListener);
  }
  RED.nodes.registerType('gecko exec',Command);
  
  Command.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.off('response', this.eventListener);
  }
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
