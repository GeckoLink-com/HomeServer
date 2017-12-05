module.exports = function(RED) {

  function Command(config) {
    RED.nodes.createNode(this,config);
    this.deviceName = config.deviceName;
    this.func = config.func;
    this.mode = config.mode;
    this.script = config.script;

    this.on("input", () => {
      const homeServer = RED.settings.functionGlobalContext.homeServer;
      if(this.func == 'script') {
        homeServer.emit('sendControllerCommand', this, {deviceName: this.deviceName, command: this.script, id:this.id, func:this.script.replace(/[ \t].*$/,''), mode:this.script.replace(/^[^ \t]*/, '').trim()});
      } else {
        if(homeServer.IsResponsiveCommandFunc(this.deviceName, this.func)) {
          let stat = null;
          for(let st of homeServer.status) {
            if((st.deviceName == this.deviceName) && (st.func == this.func)) {
              stat = st;
              break;
            }
          }
          if(stat.valueName == this.mode) return;
        }
        homeServer.emit('sendControllerCommand', this, {deviceName: this.deviceName, command: this.func + ' ' + this.mode, id:this.id, func:this.func, mode:this.mode});
      }
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
  RED.nodes.registerType('gecko command',Command);
  
  Command.prototype.close = function() {
    RED.settings.functionGlobalContext.homeServer.removeListener('response', this.eventListener);
  }

  RED.httpAdmin.get('/gecko/:id', RED.auth.needsPermission('gecko.read'), (req, res) => {
    res.json(RED.settings.functionGlobalContext.get('homeServer'));
  });
}
