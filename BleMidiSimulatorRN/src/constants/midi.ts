// BLE MIDI Service and Characteristic UUIDs
export const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

// MIDI Message Types
export const MIDI_MESSAGE_TYPES = {
  NOTE_OFF: 0x80,
  NOTE_ON: 0x90,
  AFTERTOUCH: 0xa0,
  CONTROL_CHANGE: 0xb0,
  PROGRAM_CHANGE: 0xc0,
  CHANNEL_PRESSURE: 0xd0,
  PITCH_BEND: 0xe0,
} as const;

// BLE MIDI Packet Structure
export const BLE_MIDI = {
  HEADER_BYTE: 0x80,
  TIMESTAMP_MASK: 0x7f,
  TIMESTAMP_MSB_MASK: 0x80,
} as const;

// Performance Constants
export const PERFORMANCE = {
  MAX_CONNECTIONS: 8,
  MIDI_MESSAGE_RATE: 1000, // messages per second
  TARGET_LATENCY_MS: 5,
  MAX_LOG_MESSAGES: 100,
} as const;