//
// HomeServer.js
//
// Copyright (C) 2016-2017 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const fs = require('fs');
const Common = require('./Common');
const SetupWebServer = require('./SetupWebServer');
const ControllerConnection = require('./ControllerConnection');
const ServerConnection = require('./ServerConnection');
const HomeBridgePlatform = require('./HomeBridgePlatform');
const SmartMeter = require('./SmartMeter');
const LocalAddressRegister = require('./LocalAddressRegister');
const HueAPI = require('./HueAPI.js');
const process = require('process');

process.on('uncaughtException', (err) => {
  console.log('----');
  console.log('[[ Exception ]]');
  console.log(Date());
  console.log('uid:', process.getuid());
  console.log(err);
  console.log(err.stack);
  console.log('----');
});

let user = null;
let group = null;
let configFile = null;
let local = false;
for(let i = 2; i < process.argv.length; i++) {
  if(process.argv[i] == '-u') {
    if(i + 1 < process.argv.length) user = process.argv[i + 1];
    i++;
  }
  if(process.argv[i] == '-g') {
    if(i + 1 < process.argv.length) group = process.argv[i + 1];
    i++;
  }
  if(process.argv[i] == '-c') {
    if(i + 1 < process.argv.length) configFile = process.argv[i + 1];
    i++;
  }
  if(process.argv[i] == '-l') local = true;
}
if(configFile == null) configFile = __dirname + '/../config.json';
const common = new Common(JSON.parse(fs.readFileSync(configFile, 'UTF-8')));
common.user = user;
common.group = group;
if(process.env['HOME']) common.home = process.env['HOME'];
if(user) {
  if(process.platform == 'darwin') {
    common.home = '/Users/' + user;
  } else if(process.platform == 'linux') {
    common.home = '/home/' + user;
  }
}
if(local) common.config.setupWebServerPort = 4080;

new SetupWebServer(common, () => {
  new ControllerConnection(common);
  new ServerConnection(common);
  new HomeBridgePlatform(common);
  new SmartMeter(common);
  new LocalAddressRegister(common);
  new HueAPI(common);
  common.initialState = true;
  common.emit('changeSystemConfig', common);
  common.emit('changeHueBridges', common);
  common.emit('changeUITable', common);
  common.emit('changeControllerLog', common);
  common.emit('statusNotify', common);
  common.initialState = false;
});

