"use strict";
// BLE MIDI 定数
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIDI_CONNECTION_TIMEOUT = exports.MAX_RECEIVED_MESSAGES = exports.DEFAULT_DEVICE_NAME = exports.ADVERTISING_DATA = exports.BLE_MIDI_CHARACTERISTIC_UUID = exports.BLE_MIDI_SERVICE_UUID = void 0;
exports.BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
exports.BLE_MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';
// アドバタイジング設定
exports.ADVERTISING_DATA = {
    flags: 0x06, // LE General Discoverable Mode + BR/EDR Not Supported
    completeLocalName: 'BLE MIDI Simulator',
    completeListOfServiceUUIDs: [exports.BLE_MIDI_SERVICE_UUID],
    serviceData: [
        {
            uuid: exports.BLE_MIDI_SERVICE_UUID,
            data: Buffer.from([0x00]) // MIDI機器識別子
        }
    ]
};
// デフォルト設定
exports.DEFAULT_DEVICE_NAME = 'BLE MIDI Simulator';
exports.MAX_RECEIVED_MESSAGES = 100;
exports.MIDI_CONNECTION_TIMEOUT = 10000; // 10秒
