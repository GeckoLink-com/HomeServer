//
// GoogleHomeServiceSwitch.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceSwitch {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item) {
    if(!item.buttons || !item.buttons.length) return null;
    const searchStat = this.SearchStatus(item, ['ha0', 'ha1', 'sw', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'vsw0', 'vsw1', 'vsw2', 'vsw3']);
    const res = {
      type: 'action.devices.types.SWITCH',
      traits: [
        'action.devices.traits.OnOff',
      ],
      reportStatus: [],
      customData: {
        label: item.label,
        type: item.type,
        Query: {
          sensor: searchStat,
        },
        Exec: {},
      },
    };
    if(searchStat) res.reportStatus.push(searchStat);

    if(item.buttons) {
      if(item.buttons[0] && (item.buttons[0].mode === 'on') && item.buttons[0].command) {
        res.customData.Exec.On = item.buttons[0];
      } else if(item.buttons[1] && (item.buttons[1].mode === 'on') && item.buttons[1].command) {
        res.customData.Exec.On = item.buttons[1];
      }
      if(item.buttons[1] && (item.buttons[1].mode === 'off') && item.buttons[1].command) {
          res.customData.Exec.Off = item.buttons[1];
      } else if(item.buttons[0] && (item.buttons[0].mode === 'off') && item.buttons[0].command) {
          res.customData.Exec.Off = item.buttons[0];
      }
    }
    if(item.type === 'light') res.type = 'action.devices.types.LIGHT';
    return res;
  }

  async IntentQuery(customData) {

    const stat = this.GetStatus(customData.Query.sensor);
    const query = {
      online: true,
      status: 'SUCCESS',
      on: stat.valueName === "on",
    };
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    switch(execution.command) {
    case 'action.devices.commands.OnOff':
      {
        const value = execution.params.on;
        const states = { on: value };
        if(value) {
          if(customData.Exec.On) return this.ExecCommand(customData.Exec.On.deviceName, customData.Exec.On.command, deviceId, states);
        } else {
          if(customData.Exec.Off) return this.ExecCommand(customData.Exec.Off.deviceName, customData.Exec.Off.command, deviceId, states);
        }
      }
      break;
    default:
    }
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.label} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceSwitch;
