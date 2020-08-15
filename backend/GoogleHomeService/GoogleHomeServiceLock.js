//
// GoogleHomeServiceLock.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceLock {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item) {
    if(!item.buttons || !item.buttons.length) return null;
    const searchStat = this.SearchStatus(item, ['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
    const res = {
      type: 'action.devices.types.LOCK',
      traits: [
        'action.devices.traits.LockUnlock',
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
    return res;
  }

  async IntentQuery(customData) {

    const stat = this.GetStatus(customData.Query.sensor);
    const query = {
      online: (stat.valueName != null),
      status: 'SUCCESS',
      isLocked: (stat.valueName === 'close'),
      isJammed: false,
    };
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    switch(execution.command) {
    case 'action.devices.commands.LockUnlock':
      {
        const value = execution.params.lock;
        const states = {
          isLocked: (stat.valueName === 'close'),
          isJammed: false,
        };
        const stat = this.GetStatus(customData.Query.sensor);
        const oldValue = (stat.valueName === 'close');
        if(oldValue !== value) {
          if(!value) {
            if(customData.Exec.Open) return this.ExecCommand(customData.Exec.Open.deviceName, customData.Exec.Open.command, deviceId, states);
          } else {
            if(customData.Exec.Close) return this.ExecCommand(customData.Exec.Close.deviceName, customData.Exec.Close.command, deviceId, states);
          }
        }
      }
      break;
    default:
    }
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.label} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceLock;
