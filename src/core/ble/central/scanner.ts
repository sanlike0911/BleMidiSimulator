import { BleManager, Device } from 'react-native-ble-plx';
import { BluetoothDevice, ScanFilter, ScanOptions, ScanEvent } from '../../../types/ble';
import { MIDI_SERVICE_UUID } from '../../../constants/midi';

export class BleScanner {
  private manager: BleManager;
  private isScanning: boolean = false;
  private scannedDevices: Map<string, BluetoothDevice> = new Map();
  private eventListeners: Map<ScanEvent, ((data: any) => void)[]> = new Map();

  constructor(manager: BleManager) {
    this.manager = manager;
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('deviceFound', []);
    this.eventListeners.set('scanStarted', []);
    this.eventListeners.set('scanStopped', []);
    this.eventListeners.set('error', []);
  }

  public addEventListener(event: ScanEvent, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  public removeEventListener(event: ScanEvent, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private emit(event: ScanEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  private convertDevice(device: Device): BluetoothDevice {
    return {
      id: device.id,
      name: device.name || undefined,
      localName: device.localName || undefined,
      manufacturerData: device.manufacturerData || undefined,
      serviceUUIDs: device.serviceUUIDs || undefined,
      rssi: device.rssi || undefined,
      isConnectable: device.isConnectable !== false,
    };
  }

  public async startScan(filter?: ScanFilter, options?: ScanOptions): Promise<void> {
    try {
      // Check if BLE is available and powered on
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        throw new Error(`Bluetooth is not available. Current state: ${state}`);
      }

      // Stop any existing scan
      if (this.isScanning) {
        await this.stopScan();
      }

      // Clear previous scan results
      this.scannedDevices.clear();

      // Prepare scan options
      const scanOptions = {
        allowDuplicates: options?.allowDuplicates || false,
        scanMode: this.getScanMode(options?.scanMode),
      };

      // Prepare service UUIDs for filtering
      const serviceUUIDs = filter?.serviceUUIDs || [MIDI_SERVICE_UUID];

      this.isScanning = true;
      this.emit('scanStarted');

      // Start scanning
      this.manager.startDeviceScan(
        serviceUUIDs,
        scanOptions,
        (error, device) => {
          if (error) {
            console.error('BLE Scan Error:', error);
            this.emit('error', error);
            return;
          }

          if (device) {
            const bleDevice = this.convertDevice(device);

            // Apply additional filters
            if (this.shouldIncludeDevice(bleDevice, filter)) {
              this.scannedDevices.set(device.id, bleDevice);
              this.emit('deviceFound', bleDevice);
            }
          }
        }
      );

      // Auto-stop scan after timeout
      if (options?.timeout) {
        setTimeout(() => {
          if (this.isScanning) {
            this.stopScan();
          }
        }, options.timeout);
      }

    } catch (error) {
      this.isScanning = false;
      this.emit('error', error);
      throw error;
    }
  }

  public async stopScan(): Promise<void> {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      this.emit('scanStopped');
    }
  }

  public getScannedDevices(): BluetoothDevice[] {
    return Array.from(this.scannedDevices.values());
  }

  public getDeviceById(deviceId: string): BluetoothDevice | undefined {
    return this.scannedDevices.get(deviceId);
  }

  public clearScannedDevices(): void {
    this.scannedDevices.clear();
  }

  public isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  private getScanMode(mode?: 'lowPower' | 'balanced' | 'lowLatency'): number {
    // Map scan modes to react-native-ble-plx scan modes
    switch (mode) {
      case 'lowPower':
        return 0; // SCAN_MODE_LOW_POWER
      case 'balanced':
        return 1; // SCAN_MODE_BALANCED
      case 'lowLatency':
        return 2; // SCAN_MODE_LOW_LATENCY
      default:
        return 1; // Default to balanced
    }
  }

  private shouldIncludeDevice(device: BluetoothDevice, filter?: ScanFilter): boolean {
    if (!filter) {
      return true;
    }

    // Filter by device name
    if (filter.deviceName) {
      const deviceName = device.name || device.localName || '';
      if (!deviceName.toLowerCase().includes(filter.deviceName.toLowerCase())) {
        return false;
      }
    }

    // Additional filtering logic can be added here
    // For now, we rely primarily on service UUID filtering done by the BLE manager

    return true;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      return state === 'PoweredOn';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  public destroy(): void {
    this.stopScan();
    this.scannedDevices.clear();
    this.eventListeners.clear();
  }
}