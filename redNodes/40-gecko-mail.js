module.exports = function(RED) {

  function Command(config) {
    RED.nodes.createNode(this,config);
    this.name = config.name;
    this.body = config.body;

    this.on("input", (msg) => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;

      homeServer.emit('sendMail', this, {type:'mail', data:{subject: this.name, text: this.body + '\n' + JSON.stringify(msg.payload, null, 2)}});
    });
  }
  RED.nodes.registerType('gecko mail',Command);
  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
