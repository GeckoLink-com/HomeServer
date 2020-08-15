//
// GoogleHomeServiceColorLight.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceColorLight {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item) {
    const res = {
      type: 'action.devices.types.LIGHT',
      traits: [
        'action.devices.traits.OnOff',
        'action.devices.traits.ColorSetting',
      ],
      attributes: {
        colorModel: 'rgb',
      },
      reportStatus: [
        {
          deviceName: item.table.deviceName,
          func: item.table.type,
        },
        {
          deviceName: item.table.deviceName,
          func: 'switch',
        },
      ],
      customData: {
        label: item.label,
        type: item.type,
        Query: {
          deviceName: item.table.deviceName,
          func: item.table.type,
          type: item.table.type,
        },
        Exec: {
          ColorSetting: {
            type: item.table.type,
            deviceName: item.table.deviceName,
            dmxAddress: item.table.dmxAddress,
          },
        },
      },
    };
    if(item.buttons) {
      if(item.buttons[0] && item.buttons[0].command) {
        res.customData.Exec.On = {
          deviceName: item.buttons[0].deviceName,
          command: item.buttons[0].command,
        };
      } else {
        res.customData.Exec.On = {
          deviceName: item.table.deviceName,
          command: 'switch on',
        };
      }
      if(item.buttons[1] && item.buttons[1].command) {
        res.customData.Exec.Off = {
          deviceName: item.buttons[1].deviceName,
          command: item.buttons[1].command,
        };
      } else if(item.buttons[0] && item.buttons[0].command) {
        res.customData.Exec.Off = {
          deviceName: item.buttons[0].deviceName,
          command: item.buttons[0].command,
        };
      } else {
        res.customData.Exec.Off = {
          deviceName: item.table.deviceName,
          command: 'switch off',
        };
      }
    }
    return res;
  }

  async IntentQuery(customData) {

    const stat = this.GetStatus(customData.Query.deviceName, customData.Query.type);
    const stat2 = this.GetStatus(customData.Query.deviceName, 'switch');
    const query = {
      online: true,
      status: 'SUCCESS',
    };
    if(customData.Query.type === 'led') {
      query.color = {
        spectrumRgb: parseInt(stat.value, 16),
      };
      query.on = (stat2.value === 'on') || (stat2.value === true);
    }
    if(customData.Query.type === 'dmx') {
      const [_addr, red, green, blue] = (stat.value || '0 0 0 0').split(/[ ,]/);
      query.color = {
        spectrumRgb: (parseInt(red) << 16) + (parseInt(green) << 8) + parseInt(blue),
      };
      query.on = (stat2.value === 'on') || (stat2.value === true);
    }
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
          return this.ExecCommand(customData.Exec.On.deviceName, customData.Exec.On.command, deviceId, states);
        } else {
          return this.ExecCommand(customData.Exec.Off.deviceName, customData.Exec.Off.command, deviceId, states);
        }
      }
    case 'action.devices.commands.ColorAbsolute':
      if(execution.params.color.spectrumRGB) {
        const value = execution.params.color.spectrumRGB;
        const states = { color: execution.params.color };
        if(customData.Exec.ColorSetting.type === 'led') {
          const rgb = `000000${value.toString(16)}`.slice(-6);
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `led ${rgb}`, deviceId, states);
        }
        if(customData.Exec.ColorSetting.type === 'dmx') {
          const red = (value >> 16) & 255;
          const green = (value >> 8) & 255;
          const blue = (value >> 0) & 255;
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `dmx ${customData.Exec.ColorSetting.dmxAddress - 1} ${red} ${green} ${blue}`, deviceId, states);
        }
      }
      break;
    default:
    }
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.label} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceColorLight;
