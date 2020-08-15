//
// GoogleHomeServiceWindow.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceWindow {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item) {
    if(!item.buttons || !item.buttons.length) return null;
    const searchStat = this.SearchStatus(item, ['sw', 'gpio0', 'gpio1', 'gpio2', 'gpio3', 'vsw0', 'vsw1', 'vsw2', 'vsw3']);
    const res = {
      type: 'action.devices.types.WINDOW',
      traits: [
        'action.devices.traits.OpenClose',
      ],
      attributes: {
        discreteOnlyOpenClose: true,
      },
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
      if(item.buttons[0] && (item.buttons[0].mode === 'open') && item.buttons[0].command) {
        res.customData.Exec.Open = item.buttons[0];
      } else if(item.buttons[1] && (item.buttons[1].mode === 'open') && item.buttons[1].command) {
        res.customData.Exec.Open = item.buttons[1];
      }
      if(item.buttons[1] && (item.buttons[1].mode === 'close') && item.buttons[1].command) {
          res.customData.Exec.Close = item.buttons[1];
      } else if(item.buttons[0] && (item.buttons[0].mode === 'close') && item.buttons[0].command) {
          res.customData.Exec.Open = item.buttons[0];
      }
    }
    if(item.type === 'blind') res.type = 'action.devices.types.BLINDS';
    if(item.type === 'shutter') res.type = 'action.devices.types.SHUTTER';
    return res;
  }

  async IntentQuery(customData) {

    const stat = this.GetStatus(customData.Query.sensor);
    const query = {
      online: true,
      status: 'SUCCESS',
      on: true,
    };

    if(stat.valueName === 'open') {
      query.openPercent = 100;
    } else if(stat.valueName === 'opening') {
      query.openPercent = 50;
    } else if(stat.valueName === 'closing') {
      query.openPercent = 50;
    } else if(stat.valueName === 'close') {
      query.openPercent = 0;
    }
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    switch(execution.command) {
    case 'action.devices.commands.OpenClose':
      {
        const value = execution.params.openPercent;
        const states = {
          openPercent: value,
        };
        if(value > 50) {
          if(customData.Exec.Open) return this.ExecCommand(customData.Exec.Open.deviceName, customData.Exec.Open.command, deviceId, states);
          states.openPercent = 100;
        } else {
          if(customData.Exec.Close) return this.ExecCommand(customData.Exec.Close.deviceName, customData.Exec.Close.command, deviceId, states);
          states.openPercent = 0;
        }
      }
      break;
    default:
    }
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.label} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceWindow;
