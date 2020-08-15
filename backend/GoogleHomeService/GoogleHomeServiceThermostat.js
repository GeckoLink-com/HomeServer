//
// GoogleHomeServiceThermostat.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceThermostat {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item, table) {
    const tempMin = table[item.table.prefix].heater.min;
    const tempMax = table[item.table.prefix].cooler.max;
    const searchStat = this.SearchStatus(item, ['ha0', 'ha1', 'gpio0', 'gpio1', 'gpio2', 'gpio3']);
    const res = {
      type: 'action.devices.types.THERMOSTAT',
      traits: [
        'action.devices.traits.TemperatureSetting',
      ],
      attributes: {
        availableThermostatModes: 'off,heat,cool,on',
        thermostatTemperatureUnit: 'C',
        thermostatTemperatureRange: {
          minThresholdCelsius: tempMin,
          maxThresholdCelsius: tempMax,
        },
      },
      reportStatus: [
        searchStat || {
          deviceName: item.table.deviceName,
          func: item.table.prefix,
        },
      ],
      customData: {
        label: item.label,
        type: item.type,
        Query: {
          Control: {
            deviceName: item.table.deviceName,
            func: item.table.prefix,
          },
          OnOff: searchStat,
          Temp: this.SearchStatus(item, ['ad0', 'ad1', 'ad2', 'ad3']),
        },
        Exec: {
          Set: {
            deviceName: item.table.deviceName,
            prefix: item.table.prefix,
          },
        },
      },
    };
    if(item.buttons.length === 1) {
      res.customData.Exec.Off = {
        deviceName: item.buttons[0].deviceName,
        command: item.buttons[0].command,
      };
    } else {
      res.customData.Exec.Off = {
        deviceName: item.table.deviceName,
        command: `${item.table.prefix}_off`,
      };
    }
    return res;
  }

  async IntentQuery(customData) {

    const statControl = this.GetStatus(customData.Query.Control);
    const statOnOff = this.GetStatus(customData.Query.OnOff);
    const statTemp = this.GetStatus(customData.Query.Temp);
    let mode = statControl.mode;
    if(mode === 'cooler') mode = 'cool';
    if(mode === 'heater') mode = 'heat';
    if((statOnOff.valueName !== 'on') && (parseInt(statOnOff.value) === 0)) mode = 'off';

    const query = {
      online: true,
      status: 'SUCCESS',
      thermostatMode: mode,
      thermostatTemperatureSetpoint: parseInt(statControl[statControl.mode]),
      thermostatTemperatureAmbient: parseFloat(statTemp.value),
    };
    return query;
  }

  async IntentExec(customData, deviceId, execution) {

    const statControl = this.GetStatus(customData.Query.Control);
    const statOnOff = this.GetStatus(customData.Query.OnOff);
    const statTemp = this.GetStatus(customData.Query.Temp);
    let power = statOnOff.valueName || 'off';
    let mode = statControl.mode || 'cooler';
    let targetTemp = parseInt(statControl[statControl.mode]) || 26;
    const ambientTemp = parseFloat(statTemp.value) || 26;

    switch(execution.command) {
    case 'action.devices.commands.ThermostatSetMode':
      switch(execution.params.thermostatMode) {
      case 'on':
        power = 'on';
        if((mode == null) || (mode === 'off')) {
          if(!targetTemp) {
            if(parseFloat(ambientTemp) < 20) {
              mode = 'heater';
              targetTemp = '22';
            } else {
              mode = 'cooler';
              targetTemp = '26';
            }
          } else {
            if(parseFloat(ambientTemp) < parseFloat(targetTemp)) {
              mode = 'heater';
            } else {
              mode = 'cooler';
            }
          }
        }
        break;
      case 'off':
        power = 'off';
        break;
      case 'heat':
        power = 'on';
        mode = 'heater';
        break;
      case 'cool':
        power = 'on';
        mode = 'cooler';
        break;
      default:
      }
      break;
    case 'action.devices.commands.ThermostatTemperatureSetpoint':
      targetTemp = Math.round(execution.params.thermostatTemperatureSetpoint);
      power = 'on';
      break;
    default:
    }

    const states = {
      thermostatTemperatureAmbient: ambientTemp,
      thermostatTemperatureSetpoint: targetTemp,
      thermostatMode: 'off',
    };
    if(power === 'off') {
      return this.ExecCommand(customData.Exec.Off.deviceName, customData.Exec.Off.command, deviceId, states);
    }
    if(mode === 'heater') states.thermostatMode = 'heat';
    if(mode === 'cooler') states.thermostatMode = 'cool';
    return this.ExecCommand(customData.Exec.Set.deviceName, `${customData.Exec.Set.prefix}_${mode}${targetTemp}`, deviceId, states);
  }
}

module.exports = GoogleHomeServiceThermostat;
