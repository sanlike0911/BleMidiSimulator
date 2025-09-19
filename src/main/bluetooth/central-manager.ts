import noble from '@abandonware/noble';
import { EventEmitter } from 'events';
import { BLE_MIDI_SERVICE_UUID, BLE_MIDI_CHARACTERISTIC_UUID } from '../../shared/constants';
import { BluetoothDevice, ConnectionState } from '../../shared/types';

type CentralManagerState = ConnectionState | 'scanning';

export class CentralManager extends EventEmitter {
  private scanningTimeoutId: NodeJS.Timeout | null = null;
  private connectedPeripheral: any = null;
  private midiCharacteristic: any = null;
  private connectionState: CentralManagerState = 'disconnected';
  private nameFilter: string = '';

  constructor() {
    super();
    this.setupNobleEventHandlers();
  }

  private setupNobleEventHandlers() {
    noble.on('stateChange', (state) => {
      console.log('Noble state changed:', state);
      this.emit('stateChange', state);

      if (state === 'poweredOn') {
        console.log('Bluetooth is powered on and ready');
      } else {
        console.log('Bluetooth is not available or not powered on');
        if (this.connectionState === 'scanning') {
          this.stopScan();
        }
      }
    });

    noble.on('discover', (peripheral) => {
      const deviceName = peripheral.advertisement.localName || 'Unknown Device';

      // Apply name filter if set
      if (this.nameFilter && !deviceName.toLowerCase().includes(this.nameFilter.toLowerCase())) {
        return;
      }

      // Check if device advertises MIDI service
      const serviceUuids = peripheral.advertisement.serviceUuids || [];
      const hasMidiService = serviceUuids.some(uuid =>
        uuid.toLowerCase() === BLE_MIDI_SERVICE_UUID.toLowerCase().replace(/-/g, '')
      );

      if (hasMidiService) {
        const device: BluetoothDevice = {
          id: peripheral.id,
          name: deviceName,
          rssi: peripheral.rssi,
          connected: false
        };

        console.log('MIDI device discovered:', device);
        this.emit('deviceFound', device);
      }
    });
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((noble as any).state === 'poweredOn') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Bluetooth initialization timeout'));
      }, 10000);

      noble.once('stateChange', (state) => {
        clearTimeout(timeout);
        if (state === 'poweredOn') {
          resolve();
        } else {
          reject(new Error(`Bluetooth not available: ${state}`));
        }
      });
    });
  }

  async startScan(nameFilter?: string): Promise<void> {
    if ((noble as any).state !== 'poweredOn') {
      throw new Error('Bluetooth is not powered on');
    }

    this.nameFilter = nameFilter || '';
    this.connectionState = 'scanning';

    // Start scanning for any device (we'll filter in the discover handler)
    await (noble as any).startScanningAsync([], false);
    console.log('Started scanning for BLE MIDI devices');

    // Set a reasonable timeout for scanning
    this.scanningTimeoutId = setTimeout(() => {
      this.stopScan();
    }, 30000); // 30 seconds timeout

    this.emit('scanStarted');
  }

  async stopScan(): Promise<void> {
    if (this.scanningTimeoutId) {
      clearTimeout(this.scanningTimeoutId);
      this.scanningTimeoutId = null;
    }

    if ((noble as any).state === 'poweredOn') {
      await (noble as any).stopScanningAsync();
    }

    if (this.connectionState === 'scanning') {
      this.connectionState = 'disconnected';
    }

    console.log('Stopped scanning');
    this.emit('scanStopped');
  }

  async connect(deviceId: string): Promise<void> {
    console.log('Attempting to connect to device:', deviceId);

    const peripheral = (noble as any)._peripherals[deviceId];
    if (!peripheral) {
      throw new Error('Device not found');
    }

    try {
      this.connectionState = 'connecting';
      this.emit('connectionStateChange', 'connecting');

      await peripheral.connectAsync();
      console.log('Connected to peripheral');

      this.connectedPeripheral = peripheral;

      // Discover services and characteristics
      await peripheral.discoverServicesAsync([BLE_MIDI_SERVICE_UUID]);

      const services = peripheral.services;
      const midiService = services.find((service: any) =>
        service.uuid.toLowerCase() === BLE_MIDI_SERVICE_UUID.toLowerCase().replace(/-/g, '')
      );

      if (!midiService) {
        throw new Error('MIDI service not found');
      }

      await midiService.discoverCharacteristicsAsync([BLE_MIDI_CHARACTERISTIC_UUID]);

      const characteristics = midiService.characteristics;
      this.midiCharacteristic = characteristics.find((char: any) =>
        char.uuid.toLowerCase() === BLE_MIDI_CHARACTERISTIC_UUID.toLowerCase().replace(/-/g, '')
      );

      if (!this.midiCharacteristic) {
        throw new Error('MIDI characteristic not found');
      }

      // Subscribe to notifications
      await this.midiCharacteristic.subscribeAsync();
      this.midiCharacteristic.on('data', (data: Buffer) => {
        this.handleIncomingMidiData(data);
      });

      // Set up disconnect handler
      peripheral.once('disconnect', () => {
        console.log('Peripheral disconnected');
        this.handleDisconnection();
      });

      this.connectionState = 'connected';
      this.emit('connectionStateChange', 'connected');

      const device: BluetoothDevice = {
        id: peripheral.id,
        name: peripheral.advertisement.localName || 'Unknown Device',
        rssi: peripheral.rssi,
        connected: true
      };

      this.emit('connected', device);
      console.log('Successfully connected to MIDI device');

    } catch (error) {
      console.error('Connection failed:', error);
      this.connectionState = 'disconnected';
      this.emit('connectionStateChange', 'disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedPeripheral) {
      try {
        await this.connectedPeripheral.disconnectAsync();
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
    this.handleDisconnection();
  }

  private handleDisconnection() {
    this.connectedPeripheral = null;
    this.midiCharacteristic = null;
    this.connectionState = 'disconnected';
    this.emit('connectionStateChange', 'disconnected');
    this.emit('disconnected');
  }

  async sendMidiMessage(message: Uint8Array): Promise<void> {
    if (!this.midiCharacteristic || this.connectionState !== 'connected') {
      throw new Error('Not connected to a MIDI device');
    }

    try {
      // Create BLE MIDI packet with timestamp
      const timestamp = performance.now();
      const timestampMsb = 0x80 | ((timestamp >> 7) & 0x3F);
      const timestampLsb = 0x80 | (timestamp & 0x7F);

      const blePacket = new Uint8Array([timestampMsb, timestampLsb, ...message]);

      console.log('Sending MIDI message:', Array.from(blePacket));
      await this.midiCharacteristic.writeAsync(Buffer.from(blePacket), false);

    } catch (error) {
      console.error('Failed to send MIDI message:', error);
      throw error;
    }
  }

  private handleIncomingMidiData(data: Buffer) {
    try {
      console.log('Received MIDI data:', Array.from(data));
      this.emit('midiMessageReceived', new Uint8Array(data));
    } catch (error) {
      console.error('Error processing incoming MIDI data:', error);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState === 'scanning' ? 'disconnected' : this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  async cleanup(): Promise<void> {
    await this.stopScan();
    await this.disconnect();
  }
}