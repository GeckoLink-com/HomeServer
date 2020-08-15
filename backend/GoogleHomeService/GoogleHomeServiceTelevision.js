//
// GoogleHomeServiceTelevision.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceTelevision {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item, table) {
    if(!item.buttons || !item.buttons.length) return null;

    const chList = table[item.table.prefix];
    const channels = [];
    for(const net in chList) {
      if(net === 'type') continue;
      if(net === 'comment') continue;
      if(!chList[net].display) continue;
      for(const ch in chList[net]) {
        if(!chList[net][ch].display) continue;
        channels.push({
          key: net+ch,
          names: [ chList[net][ch].label ],
          number: ch,
        });
      }
    }

    const res = {
      type: 'action.devices.types.TV',
      traits: [
        'action.devices.traits.OnOff',
        'action.devices.traits.Volume',
        'action.devices.traits.Channel',
        'action.devices.traits.InputSelector',
      ],
      attributes: {
        availableChannels: channels,
        commandOnlyVolume: true,
        volumeCanMuteAndUnmute: false,
        volumeMaxLevel: 40,
        volumeDefaultPercentage: 20,
        levelStepSize: 1,
        /*
        availableInputs: [
          {
            key: 'HDMI_1',
            names: [
              { lang: 'jp', name_synonym: [ 'hdmi 1' ] },
            ],
          },
          {
            key: 'HDMI_2',
            names: [
              { lang: 'jp', name_synonym: [ 'hdmi 2' ] },
            ],
          },
          {
            key: 'HDMI_3',
            names: [
              { lang: 'jp', name_synonym: [ 'hdmi 3' ] },
            ],
          },
          {
            key: 'HDMI_4',
            names: [
              { lang: 'jp', name_synonym: [ 'hdmi 4' ] },
            ],
          },
        ],
        commandOnlyInputSelector: true,
        orderedInputs: true,
        */

      },
      reportStatus: [
        {
          deviceName: item.table.deviceName,
          func: item.table.prefix,
        },
      ],
      customData: {
        label: item.label,
        type: item.type,
        Query: {
          sensor: {
            deviceName: item.table.deviceName,
            func: item.table.prefix,
          }
        },
        Exec: {},
      },
    };
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
    return res;
  }

  async IntentQuery(customData) {

    const stat = this.GetStatus(customData.Query.sensor);
    const query = {
      online: true,
      on: (stat.switch === 'on'),
      currentVolume: 20,
      status: 'SUCCESS',
    };
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    switch(execution.command) {
    case 'action.devices.commands.OnOff':
      {
        const value = execution.params.on;
        const states = {
          on: value,
        };
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

module.exports = GoogleHomeServiceTelevision
