// MIDI Message Types

export interface MidiMessage {
  type: MidiMessageType;
  channel: number;
  timestamp: number;
  data: Uint8Array;
}

export interface NoteOnMessage extends MidiMessage {
  type: 'noteOn';
  note: number;
  velocity: number;
}

export interface NoteOffMessage extends MidiMessage {
  type: 'noteOff';
  note: number;
  velocity: number;
}

export interface ControlChangeMessage extends MidiMessage {
  type: 'controlChange';
  controller: number;
  value: number;
}

export interface ProgramChangeMessage extends MidiMessage {
  type: 'programChange';
  program: number;
}

export interface PitchBendMessage extends MidiMessage {
  type: 'pitchBend';
  value: number; // 14-bit value (0-16383)
}

export interface AftertouchMessage extends MidiMessage {
  type: 'aftertouch';
  pressure: number;
}

export interface PolyphonicAftertouchMessage extends MidiMessage {
  type: 'polyphonicAftertouch';
  note: number;
  pressure: number;
}

export interface SystemExclusiveMessage extends MidiMessage {
  type: 'systemExclusive';
  manufacturerId: number[];
  data: Uint8Array;
}

export type ParsedMidiMessage =
  | NoteOnMessage
  | NoteOffMessage
  | ControlChangeMessage
  | ProgramChangeMessage
  | PitchBendMessage
  | AftertouchMessage
  | PolyphonicAftertouchMessage
  | SystemExclusiveMessage;

export type MidiMessageType =
  | 'noteOn'
  | 'noteOff'
  | 'controlChange'
  | 'programChange'
  | 'pitchBend'
  | 'aftertouch'
  | 'polyphonicAftertouch'
  | 'systemExclusive';

// BLE MIDI Packet Structure
export interface BleMidiPacket {
  header: number;
  timestamp: number;
  messages: MidiMessage[];
}

// High Resolution CC Support
export interface HighResolutionCC {
  controller: number;
  value: number; // 14-bit value (0-16383)
  msbController: number;
  lsbController: number;
}

// MIDI Device State
export interface MidiDeviceState {
  isConnected: boolean;
  deviceName?: string;
  lastMessageTime?: number;
  messageCount: number;
  errorCount: number;
}

// MIDI Log Entry
export interface MidiLogEntry {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received';
  device: string;
  message: ParsedMidiMessage;
  rawData: Uint8Array;
}