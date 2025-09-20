import { NativeModules, Platform } from 'react-native';
import { BluetoothDevice, ScanFilter, ScanOptions, BleState } from '../../types/ble';
import { ParsedMidiMessage } from '../../types/midi';

interface WindowsBleCentralNative {
  initialize(): Promise<void>;
  getState(): Promise<BleState>;
  startScan(filter?: ScanFilter, options?: ScanOptions): Promise<void>;
  stopScan(): Promise<void>;
  connectToDevice(deviceId: string): Promise<void>;
  disconnectFromDevice(deviceId: string): Promise<void>;
  sendMidiMessage(deviceId: string, data: number[]): Promise<void>;
  requestPermissions(): Promise<boolean>;
}

// Windows BLE Central wrapper for react-native-ble-plx
export class WindowsBleCentral {
  private nativeModule: WindowsBleCentralNative | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    if (Platform.OS === 'windows') {
      try {
        this.nativeModule = NativeModules.WindowsBleCentral;
      } catch (error) {
        console.warn('Windows BLE Central native module not available:', error);
      }
    }
  }

  public isSupported(): boolean {
    return Platform.OS === 'windows' && this.nativeModule !== null;
  }

  public async initialize(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Windows BLE Central not supported on this platform');
    }

    await this.nativeModule!.initialize();
  }

  public async getState(): Promise<BleState> {
    if (!this.isSupported()) {
      return 'Unsupported';
    }

    return await this.nativeModule!.getState();
  }

  public async startScan(filter?: ScanFilter, options?: ScanOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Windows BLE Central not supported');
    }

    await this.nativeModule!.startScan(filter, options);
    this.emit('scanStarted');
  }

  public async stopScan(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    await this.nativeModule!.stopScan();
    this.emit('scanStopped');
  }

  public async connectToDevice(device: BluetoothDevice): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Windows BLE Central not supported');
    }

    await this.nativeModule!.connectToDevice(device.id);
    this.emit('connected', device);
  }

  public async disconnectFromDevice(deviceId: string): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    await this.nativeModule!.disconnectFromDevice(deviceId);
    this.emit('disconnected', { id: deviceId });
  }

  public async sendMidiMessage(device: BluetoothDevice, message: ParsedMidiMessage): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Windows BLE Central not supported');
    }

    const data = Array.from(message.data);
    await this.nativeModule!.sendMidiMessage(device.id, data);
    this.emit('messageSent', device, message);
  }

  public async requestPermissions(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    return await this.nativeModule!.requestPermissions();
  }

  // Event handling
  public addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  public destroy(): void {
    this.eventListeners.clear();
  }
}