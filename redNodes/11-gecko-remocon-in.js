module.exports = function(RED) {

  function Remocon(config) {
    RED.nodes.createNode(this,config);
    this.deviceName = config.deviceName;
    this.remoconGroup = config.remoconGroup;
    this.remoconCode = config.remoconCode;
    
    this.eventListener = (caller, msg) => {
      if((this.deviceName != 'all') && (msg.data[0].deviceName != this.deviceName)) return;
      if((this.remoconGroup != 'all') && (msg.data[0].group != this.remoconGroup)) return;
      if((this.remoconCode != 'all') && (msg.data[0].name != this.remoconCode)) return;
      this.send({'payload': {
        device: msg.data[0].deviceName,
        format: msg.data[0].format,
        name: msg.data[0].name,
        comment: msg.data[0].comment}});
    };
    RED.settings.functionGlobalContext.homeServer.on('irReceive', this.eventListener);
  }
  RED.nodes.registerType('gecko remocon in',Remocon);
  
  Remocon.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.removeListener('irReceive', this.eventListener);
  }
  
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
