// BLE Types for react-native-ble-plx integration

export interface BluetoothDevice {
  id: string;
  name?: string;
  localName?: string;
  manufacturerData?: string;
  serviceUUIDs?: string[];
  rssi?: number;
  isConnectable?: boolean;
}

export interface BluetoothConnection {
  deviceId: string;
  isConnected: boolean;
  services: BluetoothService[];
  onDisconnected?: () => void;
}

export interface BluetoothService {
  uuid: string;
  characteristics: BluetoothCharacteristic[];
}

export interface BluetoothCharacteristic {
  uuid: string;
  serviceUUID: string;
  isReadable: boolean;
  isWritable: boolean;
  isNotifiable: boolean;
  value?: ArrayBuffer;
}

export interface ScanFilter {
  serviceUUIDs?: string[];
  deviceName?: string;
  manufacturerData?: ArrayBuffer;
}

export interface ScanOptions {
  allowDuplicates?: boolean;
  scanMode?: 'lowPower' | 'balanced' | 'lowLatency';
  timeout?: number;
}

export interface ConnectionOptions {
  autoConnect?: boolean;
  timeout?: number;
  requestMTU?: number;
}

// Platform-specific BLE Adapter Interface
export interface PlatformBleAdapter {
  // Device scanning
  startScan(filter?: ScanFilter, options?: ScanOptions): Promise<void>;
  stopScan(): Promise<void>;
  getScannedDevices(): BluetoothDevice[];

  // Device connection
  connect(device: BluetoothDevice, options?: ConnectionOptions): Promise<BluetoothConnection>;
  disconnect(deviceId: string): Promise<void>;
  isConnected(deviceId: string): boolean;

  // Service discovery
  discoverServices(deviceId: string): Promise<BluetoothService[]>;

  // Characteristic operations
  readCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<ArrayBuffer>;
  writeCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string, data: ArrayBuffer): Promise<void>;
  subscribeToCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string, callback: (data: ArrayBuffer) => void): Promise<void>;
  unsubscribeFromCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<void>;

  // State management
  getState(): Promise<'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn'>;
  requestPermissions(): Promise<boolean>;
}

export type BleState = 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';
export type ScanEvent = 'deviceFound' | 'scanStarted' | 'scanStopped' | 'error';
export type ConnectionEvent = 'connected' | 'disconnected' | 'error';