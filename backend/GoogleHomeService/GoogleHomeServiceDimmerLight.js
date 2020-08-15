//
// GoogleHomeServiceDimmerLight.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceDimmerLight {
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
        'action.devices.traits.Brightness',
      ],
      attributes: {
        colorTemperatureRange: {
          temperatureMinK: 2000,
          temperatureMaxK: 6500
        }
      },
      reportStatus: [
        {
          deviceName: item.table.deviceName,
          func: item.table.func,
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
    if((customData.Query.type === 'hue') && (stat.state)) {
      if(stat.state.ct) query.color = {
        temperatureK: Math.round(1000000 / stat.state.ct),
      };
      if(stat.state.bri) query.brightness = Math.round((stat.state.bri - 1) * 100 / 253);
      query.on = stat.state.on && stat.state.reachable;
    }
    if(customData.Query.type === 'dmx') {
      const [_addr, bri, ct] = (stat.value || '0 128 128').split(/[ ,]/);
      query.color = {
        temperatureK: Math.round((parseInt(ct) - 1) * 4500 / 254 + 2000),
      };
      query.brightness = Math.round((parseInt(bri) - 1) * 100 / 254 + 1);
      query.on = (stat2.value === 'on') || (stat2.value === true);
    }
    if(customData.Query.type === 'pwm') {
      const [bri, ct] = (stat.value || '128 128').split(/[ ,]/);
      query.color = {
        temperatureK: Math.round((parseInt(ct) - 1) * 4500 / 254 + 2000),
      };
      query.brightness = Math.round((parseInt(bri) - 1) * 100 / 254 + 1);
      query.on = (stat2.value === 'on') || (stat2.value === true);
    }
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    switch(execution.command) {
    case 'action.devices.commands.OnOff':
      {
        const value = execution.params.on;
        const states = { on: value };
        if(value) {
          return this.ExecCommand(customData.Exec.On.deviceName, customData.Exec.On.command, deviceId, states);
        } else {
          return this.ExecCommand(customData.Exec.Off.deviceName, customData.Exec.Off.command, deviceId, states);
        }
      }
    case 'action.devices.commands.BrightnessAbsolute':
      {
        const value = execution.params.brightness;
        const states = { brightness: value };
        const stat = this.GetStatus(customData.Exec.ColorSetting.deviceName, customData.Exec.ColorSetting.type);
        if(customData.Exec.ColorSetting.type === 'hue') {
          const ct = (stat.state && stat.state.ct) ? parseInt(stat.state.ct) : '182';
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `ct ${ct} ${Math.round(value * 253 / 100 + 1)}`, deviceId, states);
        }
        if(customData.Exec.ColorSetting.type === 'dmx') {
          const [_addr, _bri, ct] = (stat.value || '0 128 128').split(/[ ,]/);
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `dmx ${customData.Exec.ColorSetting.dmxAddress - 1} ${Math.round(value * 254 / 100 + 1)} ${ct}`, deviceId, states);
        }
        if(customData.Exec.ColorSetting.type === 'pwm') {
          const [_bri, ct] = (stat.value || '128 128').split(/[ ,]/);
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `pwm ${Math.round(value * 254 / 100 + 1)} ${ct}`, deviceId, states);
        }
      }
      break;
    case 'action.devices.commands.ColorAbsolute':
      if(execution.params.color.temperature) {
        const value = execution.params.color.temperature;
        const states = { color: execution.params.color };
        const stat = this.GetStatus(customData.Exec.ColorSetting.deviceName, customData.Exec.ColorSetting.type);
        if(customData.Exec.ColorSetting.type === 'hue') {
          let mired = Math.floor(1000000 / execution.params.color.temperature);
          if(mired < 153) mired = 153;
          if(mired > 500) mired = 500;
          const bri = (stat.state && stat.state.bri) ? stat.state.bri : 128;
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `ct ${mired} ${bri}`, deviceId, states);
        }
        if(customData.Exec.ColorSetting.type === 'dmx') {
          const [_addr, bri, _ct] = (stat.value || '0 128 128').split(/[ ,]/);
          let ct = Math.round((((value < 40) ? 40 : value) - 2000) * 254 / 4500 + 1);
          if(ct < 0) ct = 1;
          if(ct > 254) ct = 254;
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `dmx ${customData.Exec.ColorSetting.dmxAddress - 1} ${bri} ${ct}`, deviceId, states);
        }
        if(customData.Exec.ColorSetting.type === 'pwm') {
          const [bri, _ct] = (stat.value || '128 128').split(/[ ,]/);
          let ct = Math.round((((value < 40) ? 40 : value) - 2000) * 254 / 4500 + 1);
          if(ct < 0) ct = 1;
          if(ct > 254) ct = 254;
          return this.ExecCommand(customData.Exec.ColorSetting.deviceName, `pwm ${bri} ${ct}`, deviceId, states);
        }
      }
      break;
    default:
    }
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.label} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceDimmerLight;
