//
// GoogleHomeServiceTemperature.js
//
'use strict';

/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

class GoogleHomeServiceTemperature {
  constructor(common, api) {
    this.common = common;
    Object.assign(this, api);
  }

  IntentSync(item) {
    const res = {
      type: 'action.devices.types.SENSOR',
      traits: [
        'action.devices.traits.TemperatureControl',
      ],
      attributes: {
        queryOnlyTemperatureControl: true,
        temperatureUnitForUX: 'C',
      },
      reportStatus: [
        {
          deviceName: item.deviceName,
          func: item.func,
        },
      ],
      customData: {
        type: item.type,
        label: item.sensor,
        Query: {
          deviceName: item.deviceName,
          func: item.func,
        },
      },
    };
    return res;
  }

  async IntentQuery(customData) {
    const stat = this.GetStatus(customData.Query);
    const query = {
      online: true,
      status: 'SUCCESS',
      temperatureAmbientCelsius: parseFloat(stat.value),
      temperatureSetpointCelsius: 28,
    };
    return query;
  }

  async IntentExec(customData, deviceId, execution) {
    return { deviceId, status: 'ERROR', errorCode: 'commandInsertFailed', debugString: `${customData.type} ${customData.sensor} ${execution.command} ${execution.params}` };
  }
}

module.exports = GoogleHomeServiceTemperature;
