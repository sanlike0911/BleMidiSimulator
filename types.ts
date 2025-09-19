export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MidiDeviceState {
  // Fix: Replaced 'BluetoothDevice' with 'any' because Web Bluetooth API types are not available in this context.
  device: any | null;
  status: ConnectionStatus;
  error?: string;
}

export interface ParsedMidiMessage {
  id: number;
  timestamp: string;
  type: 'Note On' | 'Note Off' | 'Control Change' | 'Unknown';
  channel: number;
  data1: number;
  data2: number;
  description: string;
}