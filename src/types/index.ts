// Connection Status Types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// BLE Device Types
export interface BluetoothDevice {
  id: string;
  name?: string;
  isConnectable?: boolean;
  rssi?: number;
  serviceUUIDs?: string[];
}

export interface Connection {
  device: BluetoothDevice;
  characteristic?: any; // BLE characteristic reference
  isConnected: () => boolean;
}

// MIDI Message Types
export interface MidiMessage {
  id: string;
  timestamp: number;
  channel: number;
  status: number;
  data1: number;
  data2: number;
  rawData: Uint8Array;
}

export interface ParsedMidiMessage extends MidiMessage {
  type: 'Note On' | 'Note Off' | 'Control Change' | 'Unknown';
  description: string;
}

// Device State Management
export interface MidiDeviceState {
  device: BluetoothDevice | null;
  status: ConnectionStatus;
  error?: string;
}

// App State Types
export interface AppState {
  mode: 'central' | 'peripheral' | 'both';
  central: {
    deviceState: MidiDeviceState;
    connectedDevices: BluetoothDevice[];
    scanResults: BluetoothDevice[];
  };
  peripheral: {
    isAdvertising: boolean;
    isGattServerRunning: boolean;
    connectedClients: BluetoothDevice[];
  };
  midi: {
    receivedMessages: ParsedMidiMessage[];
    sentMessages: ParsedMidiMessage[];
  };
}

// Platform Types
export type Platform = 'ios' | 'android' | 'windows' | 'macos';

// BLE Adapter Interface
export interface BleAdapter {
  scanForDevices(filter?: ScanFilter): Promise<BluetoothDevice[]>;
  connectToDevice(device: BluetoothDevice): Promise<Connection>;
  disconnectFromDevice(device: BluetoothDevice): Promise<void>;
  startAdvertising?(config: AdvertisingConfig): Promise<void>;
  stopAdvertising?(): Promise<void>;
}

// Scan and Advertising Types
export interface ScanFilter {
  namePrefix?: string;
  serviceUUIDs?: string[];
  rssiThreshold?: number;
}

export interface AdvertisingConfig {
  deviceName: string;
  serviceUUIDs: string[];
  manufacturerData?: ArrayBuffer;
  txPowerLevel?: number;
}

// GATT Server Types
export interface GattService {
  uuid: string;
  characteristics: GattCharacteristic[];
}

export interface GattCharacteristic {
  uuid: string;
  properties: ('read' | 'write' | 'notify' | 'indicate')[];
  permissions: ('readable' | 'writeable')[];
  value?: ArrayBuffer;
  onRead?: () => ArrayBuffer;
  onWrite?: (data: ArrayBuffer) => void;
}

export interface GattServer {
  services: GattService[];
  isRunning: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  addService(service: GattService): Promise<void>;
  removeService(uuid: string): Promise<void>;
}

// Component Props Types
export interface SenderComponentProps {
  id: number;
  onSend: (message: Uint8Array) => Promise<void>;
  disabled: boolean;
  onRemove: (id: number) => void;
  isDragging: boolean;
  onDragStart: (e: any, id: number) => void;
  onDrop: (e: any, dropTargetId: number) => void;
  onDragEnd: () => void;
}

export interface ConnectionManagerProps {
  deviceState: MidiDeviceState;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  deviceNameFilter: string;
  onDeviceNameChange: (name: string) => void;
}

export interface MidiLogProps {
  messages: ParsedMidiMessage[];
}

// Peripheral Mode Types
export interface VirtualInstrument {
  id: string;
  name: string;
  type: 'piano' | 'drum' | 'controller';
  sendMidiMessage: (message: MidiMessage) => Promise<void>;
}

export interface ClientConnection {
  device: BluetoothDevice;
  connectedAt: Date;
  lastActivity: Date;
}