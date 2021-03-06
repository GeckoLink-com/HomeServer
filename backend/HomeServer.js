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
const HomeBridgePlatform = require('./HomeBridge/HomeBridgePlatform');
const GoogleHomeService = require('./GoogleHomeService/GoogleHomeService');

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
if(configFile == null) configFile = '../config';

const config = require(configFile);
config.local = local;
if(local) config.setupWebServerPort = 4080;
const common = new Common(config);
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

if(common.config.logFile) {
  const out = fs.createWriteStream(common.config.logFile, { flags: 'a'});
  /*eslint no-global-assign: "off"*/
  console = new console.Console({ stdout: out, stderr: out });
}

console.log(`GeckoLink HomeServer Ver. ${common.systemConfig.version}`);
new LocalAddressRegister(common);
new ControllerConnection(common);
new ServerConnection(common);
new HomeBridgePlatform(common);
new GoogleHomeService(common);
new SmartMeter(common);
new HueAPI(common);
new SetupWebServer(common);
