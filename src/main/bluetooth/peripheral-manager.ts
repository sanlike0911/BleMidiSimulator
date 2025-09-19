const bleno = require('bleno');
import { EventEmitter } from 'events';
import { BLE_MIDI_SERVICE_UUID, BLE_MIDI_CHARACTERISTIC_UUID } from '../../shared/constants';
import { CentralInfo } from '../../shared/types';

export class PeripheralManager extends EventEmitter {
  private isAdvertising = false;
  private connectedCentrals = new Map<string, CentralInfo>();
  private midiCharacteristic: BLEMIDICharacteristic | null = null;
  private peripheralName = 'BLE MIDI Simulator';

  constructor() {
    super();
    this.setupBlenoEventHandlers();
  }

  private setupBlenoEventHandlers() {
    bleno.on('stateChange', (state: any) => {
      console.log('Bleno state changed:', state);
      this.emit('stateChange', state);

      if (state === 'poweredOn') {
        console.log('Bleno is powered on and ready');
      } else {
        console.log('Bleno is not available or not powered on');
        if (this.isAdvertising) {
          this.stopAdvertising();
        }
      }
    });

    bleno.on('advertisingStart', (error: any) => {
      if (error) {
        console.error('Failed to start advertising:', error);
        this.emit('advertisingError', error.message);
      } else {
        console.log('Advertising started successfully');
        this.isAdvertising = true;
        this.emit('advertisingStarted');
      }
    });

    bleno.on('advertisingStop', () => {
      console.log('Advertising stopped');
      this.isAdvertising = false;
      this.emit('advertisingStopped');
    });

    bleno.on('servicesSet', (error: any) => {
      if (error) {
        console.error('Failed to set services:', error);
        this.emit('servicesError', error.message);
      } else {
        console.log('Services set successfully');
        this.emit('servicesSet');
      }
    });

    bleno.on('accept', (clientAddress: any) => {
      console.log('Central connected:', clientAddress);

      const centralInfo: CentralInfo = {
        id: clientAddress,
        address: clientAddress,
        connectionTime: new Date(),
        lastActivity: new Date(),
        mtu: 23 // Default MTU
      };

      this.connectedCentrals.set(clientAddress, centralInfo);
      this.emit('centralConnected', centralInfo);
    });

    bleno.on('disconnect', (clientAddress: any) => {
      console.log('Central disconnected:', clientAddress);

      const centralInfo = this.connectedCentrals.get(clientAddress);
      if (centralInfo) {
        this.connectedCentrals.delete(clientAddress);
        this.emit('centralDisconnected', centralInfo.id);
      }
    });

    bleno.on('mtuChange', (mtu: any, clientAddress: any) => {
      console.log(`MTU changed to ${mtu} for ${clientAddress}`);

      const centralInfo = this.connectedCentrals.get(clientAddress);
      if (centralInfo) {
        centralInfo.mtu = mtu;
        centralInfo.lastActivity = new Date();
      }
    });
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (bleno.state === 'poweredOn') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Bleno initialization timeout'));
      }, 10000);

      bleno.once('stateChange', (state: any) => {
        clearTimeout(timeout);
        if (state === 'poweredOn') {
          resolve();
        } else {
          reject(new Error(`Bleno not available: ${state}`));
        }
      });
    });
  }

  async startAdvertising(deviceName?: string): Promise<void> {
    if (bleno.state !== 'poweredOn') {
      throw new Error('Bleno is not powered on');
    }

    if (this.isAdvertising) {
      throw new Error('Already advertising');
    }

    try {
      this.peripheralName = deviceName || this.peripheralName;

      // Create MIDI characteristic
      this.midiCharacteristic = new BLEMIDICharacteristic();
      this.midiCharacteristic.onDataReceived = (data: Buffer) => {
        this.handleIncomingMidiData(data);
      };

      // Create MIDI service
      const midiService = new bleno.PrimaryService({
        uuid: BLE_MIDI_SERVICE_UUID,
        characteristics: [this.midiCharacteristic]
      });

      // Set services
      await new Promise<void>((resolve, reject) => {
        bleno.setServices([midiService], (error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Start advertising
      await new Promise<void>((resolve, reject) => {
        bleno.startAdvertising(this.peripheralName, [BLE_MIDI_SERVICE_UUID], (error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

    } catch (error) {
      console.error('Failed to start advertising:', error);
      throw error;
    }
  }

  async stopAdvertising(): Promise<void> {
    if (!this.isAdvertising) {
      return;
    }

    try {
      await new Promise<void>((resolve) => {
        bleno.stopAdvertising(() => {
          resolve();
        });
      });

      // Disconnect all centrals
      this.connectedCentrals.clear();

    } catch (error) {
      console.error('Error stopping advertising:', error);
      throw error;
    }
  }

  async sendMidiMessage(message: Uint8Array): Promise<void> {
    if (!this.midiCharacteristic || this.connectedCentrals.size === 0) {
      throw new Error('No connected centrals to send MIDI message to');
    }

    try {
      // Create BLE MIDI packet with timestamp
      const timestamp = performance.now();
      const timestampMsb = 0x80 | ((timestamp >> 7) & 0x3F);
      const timestampLsb = 0x80 | (timestamp & 0x7F);

      const blePacket = Buffer.from([timestampMsb, timestampLsb, ...message]);

      console.log('Sending MIDI message to all centrals:', Array.from(blePacket));

      // Notify all connected centrals
      await this.midiCharacteristic.notifyAll(blePacket);

    } catch (error) {
      console.error('Failed to send MIDI message:', error);
      throw error;
    }
  }

  private handleIncomingMidiData(data: Buffer) {
    try {
      console.log('Received MIDI data from central:', Array.from(data));
      this.emit('midiMessageReceived', new Uint8Array(data));

      // Update last activity for all connected centrals
      const now = new Date();
      this.connectedCentrals.forEach(central => {
        central.lastActivity = now;
      });

    } catch (error) {
      console.error('Error processing incoming MIDI data:', error);
    }
  }

  getConnectedCentrals(): CentralInfo[] {
    return Array.from(this.connectedCentrals.values());
  }

  async disconnectCentral(centralId: string): Promise<void> {
    const centralInfo = this.connectedCentrals.get(centralId);
    if (!centralInfo) {
      throw new Error('Central not found');
    }

    // Note: bleno doesn't provide a direct way to disconnect specific centrals
    // The disconnect will be handled when the central disconnects
    console.log(`Marking central ${centralId} for disconnection`);
    this.connectedCentrals.delete(centralId);
    this.emit('centralDisconnected', centralId);
  }

  isAdvertisingActive(): boolean {
    return this.isAdvertising;
  }

  getPeripheralName(): string {
    return this.peripheralName;
  }

  async cleanup(): Promise<void> {
    await this.stopAdvertising();
    this.connectedCentrals.clear();
    this.midiCharacteristic = null;
  }
}

// Custom MIDI Characteristic implementation
class BLEMIDICharacteristic extends bleno.Characteristic {
  public onDataReceived?: (data: Buffer) => void;
  private subscribers = new Set<(data: Buffer) => void>();

  constructor() {
    super({
      uuid: BLE_MIDI_CHARACTERISTIC_UUID,
      properties: ['read', 'writeWithoutResponse', 'notify'],
      value: null
    });
  }

  onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
    console.log('MIDI characteristic read request, offset:', offset);
    // Return empty buffer for read requests
    callback(bleno.Characteristic.RESULT_SUCCESS, Buffer.alloc(0));
  }

  onWriteRequest(
    data: Buffer,
    offset: number,
    withoutResponse: boolean,
    callback: (result: number) => void
  ) {
    console.log('MIDI characteristic write request:', Array.from(data));

    if (this.onDataReceived) {
      this.onDataReceived(data);
    }

    callback(bleno.Characteristic.RESULT_SUCCESS);
  }

  onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) {
    console.log('Central subscribed to MIDI notifications, maxValueSize:', maxValueSize);
    this.subscribers.add(updateValueCallback);
  }

  onUnsubscribe() {
    console.log('Central unsubscribed from MIDI notifications');
    this.subscribers.clear();
  }

  async notifyAll(data: Buffer): Promise<void> {
    if (this.subscribers.size === 0) {
      console.log('No subscribers for MIDI notifications');
      return;
    }

    console.log(`Notifying ${this.subscribers.size} subscribers with MIDI data`);
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    });
  }
}