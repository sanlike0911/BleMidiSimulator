import { BleConnector } from '../ble/central/connector';
import { MidiParser } from './parser';
import { ParsedMidiMessage, MidiLogEntry } from '../../types/midi';
import { BluetoothDevice } from '../../types/ble';
import { MIDI_SERVICE_UUID, MIDI_CHARACTERISTIC_UUID } from '../../constants/midi';

export interface BleMidiClientOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableLogging?: boolean;
  maxLogEntries?: number;
}

export interface BleMidiClientEvents {
  messageReceived: (device: BluetoothDevice, message: ParsedMidiMessage) => void;
  messageSent: (device: BluetoothDevice, message: ParsedMidiMessage) => void;
  connected: (device: BluetoothDevice) => void;
  disconnected: (device: BluetoothDevice) => void;
  error: (device: BluetoothDevice, error: Error) => void;
}

export class BleMidiClient {
  private connector: BleConnector;
  private parser: MidiParser;
  private options: Required<BleMidiClientOptions>;
  private eventListeners: Partial<BleMidiClientEvents> = {};
  private messageLog: MidiLogEntry[] = [];
  private messageCounter: number = 0;

  constructor(connector: BleConnector, options?: BleMidiClientOptions) {
    this.connector = connector;
    this.parser = new MidiParser();

    this.options = {
      autoReconnect: options?.autoReconnect ?? true,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 3,
      reconnectDelay: options?.reconnectDelay ?? 2000,
      enableLogging: options?.enableLogging ?? true,
      maxLogEntries: options?.maxLogEntries ?? 100,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.connector.addEventListener('connected', ({ device, connection }) => {
      this.handleDeviceConnected(device);
    });

    this.connector.addEventListener('disconnected', ({ deviceId, connection }) => {
      // Find device by ID and handle disconnection
      console.log(`Device disconnected: ${deviceId}`);
    });

    this.connector.addEventListener('error', ({ device, error }) => {
      this.eventListeners.error?.(device, error);
    });
  }

  public on<K extends keyof BleMidiClientEvents>(event: K, listener: BleMidiClientEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof BleMidiClientEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  public async connectToDevice(device: BluetoothDevice): Promise<void> {
    try {
      const connection = await this.connector.connect(device);

      // Verify MIDI service exists
      const midiCharacteristic = await this.connector.getMidiCharacteristic(device.id);
      if (!midiCharacteristic) {
        throw new Error('Device does not support MIDI over BLE');
      }

      if (!midiCharacteristic.isNotifiable) {
        throw new Error('MIDI characteristic does not support notifications');
      }

      // Subscribe to MIDI notifications
      await this.connector.subscribeToCharacteristic(
        device.id,
        MIDI_SERVICE_UUID,
        MIDI_CHARACTERISTIC_UUID,
        (data: ArrayBuffer) => {
          this.handleMidiData(device, data);
        }
      );

      this.eventListeners.connected?.(device);
      console.log(`MIDI client connected to: ${device.name || device.id}`);

    } catch (error) {
      console.error(`Failed to connect MIDI client to device ${device.id}:`, error);
      this.eventListeners.error?.(device, error as Error);
      throw error;
    }
  }

  public async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      await this.connector.unsubscribeFromCharacteristic(
        deviceId,
        MIDI_SERVICE_UUID,
        MIDI_CHARACTERISTIC_UUID
      );

      await this.connector.disconnect(deviceId);

      console.log(`MIDI client disconnected from: ${deviceId}`);

    } catch (error) {
      console.error(`Failed to disconnect MIDI client from device ${deviceId}:`, error);
      throw error;
    }
  }

  public async sendMidiMessage(deviceId: string, message: ParsedMidiMessage): Promise<void> {
    try {
      if (!this.connector.isConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected`);
      }

      // Create BLE MIDI packet
      const packet = this.parser.createBleMidiPacket([message], Date.now());

      // Send via BLE characteristic
      await this.connector.writeCharacteristicWithoutResponse(
        deviceId,
        MIDI_SERVICE_UUID,
        MIDI_CHARACTERISTIC_UUID,
        packet.buffer
      );

      // Log the message
      if (this.options.enableLogging) {
        this.logMessage(deviceId, 'sent', message);
      }

      // Emit event
      const device = this.getDeviceById(deviceId);
      if (device) {
        this.eventListeners.messageSent?.(device, message);
      }

    } catch (error) {
      console.error(`Failed to send MIDI message to device ${deviceId}:`, error);
      const device = this.getDeviceById(deviceId);
      if (device) {
        this.eventListeners.error?.(device, error as Error);
      }
      throw error;
    }
  }

  public async sendMidiMessages(deviceId: string, messages: ParsedMidiMessage[]): Promise<void> {
    try {
      if (!this.connector.isConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected`);
      }

      // Create BLE MIDI packet with multiple messages
      const packet = this.parser.createBleMidiPacket(messages, Date.now());

      // Send via BLE characteristic
      await this.connector.writeCharacteristicWithoutResponse(
        deviceId,
        MIDI_SERVICE_UUID,
        MIDI_CHARACTERISTIC_UUID,
        packet.buffer
      );

      // Log and emit events for each message
      const device = this.getDeviceById(deviceId);
      for (const message of messages) {
        if (this.options.enableLogging) {
          this.logMessage(deviceId, 'sent', message);
        }

        if (device) {
          this.eventListeners.messageSent?.(device, message);
        }
      }

    } catch (error) {
      console.error(`Failed to send MIDI messages to device ${deviceId}:`, error);
      const device = this.getDeviceById(deviceId);
      if (device) {
        this.eventListeners.error?.(device, error as Error);
      }
      throw error;
    }
  }

  public async sendControlChange(deviceId: string, channel: number, controller: number, value: number): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'controlChange',
      channel,
      timestamp: Date.now(),
      controller,
      value,
      data: new Uint8Array([0xb0 | channel, controller, value])
    };

    await this.sendMidiMessage(deviceId, message);
  }

  public async sendHighResolutionCC(deviceId: string, channel: number, controller: number, value: number): Promise<void> {
    // High resolution CC uses two control change messages
    // MSB (most significant byte) and LSB (least significant byte)
    const msb = (value >> 7) & 0x7f;
    const lsb = value & 0x7f;
    const lsbController = controller + 32; // LSB controllers are offset by 32

    const messages: ParsedMidiMessage[] = [
      {
        type: 'controlChange',
        channel,
        timestamp: Date.now(),
        controller,
        value: msb,
        data: new Uint8Array([0xb0 | channel, controller, msb])
      },
      {
        type: 'controlChange',
        channel,
        timestamp: Date.now(),
        controller: lsbController,
        value: lsb,
        data: new Uint8Array([0xb0 | channel, lsbController, lsb])
      }
    ];

    await this.sendMidiMessages(deviceId, messages);
  }

  public async sendNoteOn(deviceId: string, channel: number, note: number, velocity: number): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'noteOn',
      channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x90 | channel, note, velocity])
    };

    await this.sendMidiMessage(deviceId, message);
  }

  public async sendNoteOff(deviceId: string, channel: number, note: number, velocity: number = 64): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'noteOff',
      channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x80 | channel, note, velocity])
    };

    await this.sendMidiMessage(deviceId, message);
  }

  private async handleDeviceConnected(device: BluetoothDevice): Promise<void> {
    try {
      await this.connectToDevice(device);
    } catch (error) {
      console.error(`Failed to setup MIDI for connected device ${device.id}:`, error);
    }
  }

  private handleMidiData(device: BluetoothDevice, data: ArrayBuffer): void {
    try {
      const messages = this.parser.parseBleMidiPacket(data);

      for (const message of messages) {
        // Log the message
        if (this.options.enableLogging) {
          this.logMessage(device.id, 'received', message);
        }

        // Emit event
        this.eventListeners.messageReceived?.(device, message);
      }

    } catch (error) {
      console.error(`Failed to parse MIDI data from device ${device.id}:`, error);
      this.eventListeners.error?.(device, error as Error);
    }
  }

  private logMessage(deviceId: string, direction: 'sent' | 'received', message: ParsedMidiMessage): void {
    const logEntry: MidiLogEntry = {
      id: `${this.messageCounter++}`,
      timestamp: Date.now(),
      direction,
      device: deviceId,
      message,
      rawData: message.data
    };

    this.messageLog.push(logEntry);

    // Limit log size
    if (this.messageLog.length > this.options.maxLogEntries) {
      this.messageLog.shift();
    }
  }

  private getDeviceById(deviceId: string): BluetoothDevice | undefined {
    // This would need to be implemented to get device info from scanner or connection
    // For now, create a minimal device object
    return {
      id: deviceId,
      name: undefined,
    };
  }

  public getMessageLog(): MidiLogEntry[] {
    return [...this.messageLog];
  }

  public clearMessageLog(): void {
    this.messageLog = [];
    this.messageCounter = 0;
  }

  public getConnectedDevices(): string[] {
    return this.connector.getConnectedDevices().map(conn => conn.deviceId);
  }

  public isConnected(deviceId: string): boolean {
    return this.connector.isConnected(deviceId);
  }

  public destroy(): void {
    this.connector.destroy();
    this.messageLog = [];
    this.eventListeners = {};
  }
}