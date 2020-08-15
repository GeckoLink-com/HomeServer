//
// Registry.js
//
// Copyright (C) 2016-2020 Mitsuru Nakada
// This software is released under the MIT License, see license file.
//

'use strict';

const fs = require('fs');

class Registry {

  constructor(path) {
    
    this.path = path.replace(/\/$/, '');
    try {
      fs.mkdirSync(this.path);
    } catch(e) {
      // already exist
    }
  }
  
  SetRegistry(name, data) {
    this.SetText(name + '.json', JSON.stringify(data, null, '  '));
  }
  
  SetText(name, data) {
    fs.writeFileSync(this.path + '/' + name + '_new', data);
    fs.renameSync(this.path + '/' + name + '_new', this.path + '/' + name);
  }
  
  GetRegistry(name, callback) {
    this.GetText(name + '.json', (err, data) => {
      let obj = null;
      try {
        if(!err) obj = JSON.parse(data);
      } catch(e) {
        // error data
      }
      callback(err, obj);
    });
  }

  GetRegistrySync(name) {
    let obj = null;
    try {
      obj = JSON.parse(fs.readFileSync(this.path + '/' + name+ '.json', 'utf8'));
    } catch(e) {
      // error data
    }
    return obj;
  }

  GetText(name, callback) {
    fs.readFile(this.path + '/' + name, 'utf8', callback);
  }
}

module.exports = Registry;
