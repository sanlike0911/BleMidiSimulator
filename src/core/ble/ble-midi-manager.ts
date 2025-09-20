import { BleManager } from 'react-native-ble-plx';
import { BleScanner } from './central/scanner';
import { BleConnector } from './central/connector';
import { BleMidiClient, BleMidiClientOptions, BleMidiClientEvents } from '../midi/ble-midi-client';
import { BluetoothDevice, ScanOptions, ScanFilter, BleState } from '../../types/ble';
import { ParsedMidiMessage, MidiLogEntry } from '../../types/midi';
import { PERFORMANCE } from '../../constants/midi';

export interface BleMidiManagerOptions extends BleMidiClientOptions {
  maxConnections?: number;
  autoScan?: boolean;
  scanTimeout?: number;
}

export interface BleMidiManagerEvents extends BleMidiClientEvents {
  deviceFound: (device: BluetoothDevice) => void;
  scanStarted: () => void;
  scanStopped: () => void;
  stateChanged: (state: BleState) => void;
}

export class BleMidiManager {
  private bleManager: BleManager;
  private scanner: BleScanner;
  private connector: BleConnector;
  private midiClient: BleMidiClient;
  private options: Required<BleMidiManagerOptions>;
  private eventListeners: Partial<BleMidiManagerEvents> = {};
  private connectedDevices: Map<string, BluetoothDevice> = new Map();

  constructor(options?: BleMidiManagerOptions) {
    this.options = {
      maxConnections: options?.maxConnections ?? PERFORMANCE.MAX_CONNECTIONS,
      autoScan: options?.autoScan ?? false,
      scanTimeout: options?.scanTimeout ?? 10000,
      autoReconnect: options?.autoReconnect ?? true,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 3,
      reconnectDelay: options?.reconnectDelay ?? 2000,
      enableLogging: options?.enableLogging ?? true,
      maxLogEntries: options?.maxLogEntries ?? 100,
    };

    this.bleManager = new BleManager();
    this.scanner = new BleScanner(this.bleManager);
    this.connector = new BleConnector(this.bleManager);
    this.midiClient = new BleMidiClient(this.connector, options);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Scanner events
    this.scanner.addEventListener('deviceFound', (device: BluetoothDevice) => {
      this.eventListeners.deviceFound?.(device);
    });

    this.scanner.addEventListener('scanStarted', () => {
      this.eventListeners.scanStarted?.();
    });

    this.scanner.addEventListener('scanStopped', () => {
      this.eventListeners.scanStopped?.();
    });

    this.scanner.addEventListener('error', (error) => {
      console.error('Scanner error:', error);
    });

    // MIDI client events
    this.midiClient.on('connected', (device: BluetoothDevice) => {
      this.connectedDevices.set(device.id, device);
      this.eventListeners.connected?.(device);
    });

    this.midiClient.on('disconnected', (device: BluetoothDevice) => {
      this.connectedDevices.delete(device.id);
      this.eventListeners.disconnected?.(device);
    });

    this.midiClient.on('messageReceived', (device: BluetoothDevice, message: ParsedMidiMessage) => {
      this.eventListeners.messageReceived?.(device, message);
    });

    this.midiClient.on('messageSent', (device: BluetoothDevice, message: ParsedMidiMessage) => {
      this.eventListeners.messageSent?.(device, message);
    });

    this.midiClient.on('error', (device: BluetoothDevice, error: Error) => {
      this.eventListeners.error?.(device, error);
    });

    // BLE state monitoring
    this.bleManager.onStateChange((state) => {
      this.eventListeners.stateChanged?.(state as BleState);
    }, true);
  }

  public on<K extends keyof BleMidiManagerEvents>(event: K, listener: BleMidiManagerEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof BleMidiManagerEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  public async initialize(): Promise<void> {
    try {
      const state = await this.bleManager.state();
      console.log(`BLE Manager initialized. Current state: ${state}`);

      if (state !== 'PoweredOn') {
        throw new Error(`Bluetooth is not available. Current state: ${state}`);
      }

      if (this.options.autoScan) {
        await this.startScan();
      }

    } catch (error) {
      console.error('Failed to initialize BLE MIDI Manager:', error);
      throw error;
    }
  }

  public async startScan(filter?: ScanFilter, options?: ScanOptions): Promise<void> {
    const scanOptions: ScanOptions = {
      timeout: this.options.scanTimeout,
      ...options
    };

    await this.scanner.startScan(filter, scanOptions);
  }

  public async stopScan(): Promise<void> {
    await this.scanner.stopScan();
  }

  public async connectToDevice(device: BluetoothDevice): Promise<void> {
    if (this.connectedDevices.size >= this.options.maxConnections) {
      throw new Error(`Maximum number of connections (${this.options.maxConnections}) reached`);
    }

    if (this.connectedDevices.has(device.id)) {
      console.log(`Device ${device.id} is already connected`);
      return;
    }

    await this.midiClient.connectToDevice(device);
  }

  public async disconnectFromDevice(deviceId: string): Promise<void> {
    await this.midiClient.disconnectFromDevice(deviceId);
  }

  public async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connectedDevices.keys()).map(deviceId =>
      this.disconnectFromDevice(deviceId).catch(error =>
        console.error(`Failed to disconnect ${deviceId}:`, error)
      )
    );

    await Promise.all(disconnectPromises);
  }

  // MIDI message sending methods
  public async sendMidiMessage(deviceId: string, message: ParsedMidiMessage): Promise<void> {
    await this.midiClient.sendMidiMessage(deviceId, message);
  }

  public async sendMidiMessages(deviceId: string, messages: ParsedMidiMessage[]): Promise<void> {
    await this.midiClient.sendMidiMessages(deviceId, messages);
  }

  public async sendControlChange(deviceId: string, channel: number, controller: number, value: number): Promise<void> {
    await this.midiClient.sendControlChange(deviceId, channel, controller, value);
  }

  public async sendHighResolutionCC(deviceId: string, channel: number, controller: number, value: number): Promise<void> {
    await this.midiClient.sendHighResolutionCC(deviceId, channel, controller, value);
  }

  public async sendNoteOn(deviceId: string, channel: number, note: number, velocity: number): Promise<void> {
    await this.midiClient.sendNoteOn(deviceId, channel, note, velocity);
  }

  public async sendNoteOff(deviceId: string, channel: number, note: number, velocity?: number): Promise<void> {
    await this.midiClient.sendNoteOff(deviceId, channel, note, velocity);
  }

  // Broadcast methods (send to all connected devices)
  public async broadcastMidiMessage(message: ParsedMidiMessage): Promise<void> {
    const promises = Array.from(this.connectedDevices.keys()).map(deviceId =>
      this.sendMidiMessage(deviceId, message).catch(error =>
        console.error(`Failed to send message to ${deviceId}:`, error)
      )
    );

    await Promise.all(promises);
  }

  public async broadcastControlChange(channel: number, controller: number, value: number): Promise<void> {
    const promises = Array.from(this.connectedDevices.keys()).map(deviceId =>
      this.sendControlChange(deviceId, channel, controller, value).catch(error =>
        console.error(`Failed to send CC to ${deviceId}:`, error)
      )
    );

    await Promise.all(promises);
  }

  public async broadcastHighResolutionCC(channel: number, controller: number, value: number): Promise<void> {
    const promises = Array.from(this.connectedDevices.keys()).map(deviceId =>
      this.sendHighResolutionCC(deviceId, channel, controller, value).catch(error =>
        console.error(`Failed to send high-res CC to ${deviceId}:`, error)
      )
    );

    await Promise.all(promises);
  }

  // Device and state query methods
  public getScannedDevices(): BluetoothDevice[] {
    return this.scanner.getScannedDevices();
  }

  public getConnectedDevices(): BluetoothDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  public isConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  public isScanning(): boolean {
    return this.scanner.isCurrentlyScanning();
  }

  public async getBluetoothState(): Promise<BleState> {
    return await this.bleManager.state() as BleState;
  }

  public getMessageLog(): MidiLogEntry[] {
    return this.midiClient.getMessageLog();
  }

  public clearMessageLog(): void {
    this.midiClient.clearMessageLog();
  }

  public async requestPermissions(): Promise<boolean> {
    return await this.scanner.requestPermissions();
  }

  public getConnectionCount(): number {
    return this.connectedDevices.size;
  }

  public getMaxConnections(): number {
    return this.options.maxConnections;
  }

  public canConnect(): boolean {
    return this.connectedDevices.size < this.options.maxConnections;
  }

  public destroy(): void {
    this.stopScan();
    this.disconnectAll();
    this.scanner.destroy();
    this.connector.destroy();
    this.midiClient.destroy();
    this.connectedDevices.clear();
    this.eventListeners = {};

    // Destroy BLE manager
    this.bleManager.destroy();
  }
}