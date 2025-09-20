import type {
  BluetoothDevice,
  Connection,
  ScanFilter,
  AdvertisingConfig,
  GattService,
  GattServer,
} from '../../../types';

/**
 * Platform-agnostic BLE adapter interface
 * Each platform (iOS, Android, Windows, Mac) should implement this interface
 */
export interface BleAdapter {
  // Central mode operations
  scanForDevices(filter?: ScanFilter): Promise<BluetoothDevice[]>;
  stopScan(): Promise<void>;
  connectToDevice(device: BluetoothDevice): Promise<Connection>;
  disconnectFromDevice(device: BluetoothDevice): Promise<void>;
  isScanning(): boolean;

  // Peripheral mode operations (optional for platforms that support it)
  startAdvertising?(config: AdvertisingConfig): Promise<void>;
  stopAdvertising?(): Promise<void>;
  startGattServer?(services: GattService[]): Promise<GattServer>;
  stopGattServer?(): Promise<void>;
  isAdvertising?(): boolean;

  // Event listeners
  onDeviceFound?(callback: (device: BluetoothDevice) => void): void;
  onDeviceConnected?(callback: (device: BluetoothDevice) => void): void;
  onDeviceDisconnected?(callback: (device: BluetoothDevice) => void): void;
  onDataReceived?(callback: (device: BluetoothDevice, data: ArrayBuffer) => void): void;

  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * MIDI-specific BLE operations
 */
export interface MidiBleAdapter extends BleAdapter {
  sendMidiMessage(device: BluetoothDevice, message: Uint8Array): Promise<void>;
  subscribeMidiNotifications(device: BluetoothDevice): Promise<void>;
  unsubscribeMidiNotifications(device: BluetoothDevice): Promise<void>;
}

/**
 * Platform adapter factory
 */
export interface PlatformAdapterFactory {
  createAdapter(): BleAdapter;
  createMidiAdapter(): MidiBleAdapter;
}

/**
 * Connection event types
 */
export type ConnectionEvent =
  | { type: 'device_found'; device: BluetoothDevice }
  | { type: 'device_connected'; device: BluetoothDevice }
  | { type: 'device_disconnected'; device: BluetoothDevice }
  | { type: 'data_received'; device: BluetoothDevice; data: ArrayBuffer }
  | { type: 'error'; error: Error };