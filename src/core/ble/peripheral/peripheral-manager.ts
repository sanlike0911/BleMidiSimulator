import { GattServer, GattServerOptions, GattServerEvents } from './gatt-server';
import { Advertiser, AdvertiserOptions, AdvertiserEvents } from './advertiser';
import { MidiParser } from '../../midi/parser';
import {
  PeripheralDevice,
  ConnectedClient,
  AdvertisingOptions,
  PeripheralState,
  PeripheralCapabilities,
  CharacteristicRequest,
  CharacteristicResponse,
  VirtualInstrument
} from '../../../types/peripheral';
import { ParsedMidiMessage } from '../../../types/midi';
import { MIDI_SERVICE_UUID, MIDI_CHARACTERISTIC_UUID } from '../../../constants/midi';

export interface PeripheralManagerOptions extends GattServerOptions, AdvertiserOptions {
  deviceName?: string;
  autoStartAdvertising?: boolean;
  enableVirtualInstruments?: boolean;
}

export interface PeripheralManagerEvents {
  advertisingStarted: () => void;
  advertisingStopped: () => void;
  clientConnected: (client: ConnectedClient) => void;
  clientDisconnected: (clientId: string) => void;
  midiMessageReceived: (clientId: string, message: ParsedMidiMessage) => void;
  midiMessageSent: (clientId: string, message: ParsedMidiMessage) => void;
  error: (error: Error) => void;
}

export class PeripheralManager {
  private gattServer: GattServer;
  private advertiser: Advertiser;
  private midiParser: MidiParser;
  private options: Required<PeripheralManagerOptions>;
  private eventListeners: Partial<PeripheralManagerEvents> = {};
  private virtualInstruments: Map<string, VirtualInstrument> = new Map();
  private isInitialized: boolean = false;

  constructor(options?: PeripheralManagerOptions) {
    this.options = {
      deviceName: options?.deviceName || 'BLE MIDI Simulator',
      autoStartAdvertising: options?.autoStartAdvertising || false,
      enableVirtualInstruments: options?.enableVirtualInstruments || true,

      // GattServer options
      maxConnections: options?.maxConnections || 8,
      autoAcceptConnections: options?.autoAcceptConnections || true,
      enableNotifications: options?.enableNotifications || true,
      enableIndications: options?.enableIndications || false,

      // Advertiser options
      defaultLocalName: options?.defaultLocalName || options?.deviceName || 'BLE MIDI Simulator',
      autoStart: options?.autoStart || false,
      maxAdvertisingTime: options?.maxAdvertisingTime || 0,
      restartOnFailure: options?.restartOnFailure || true,
    };

    this.gattServer = new GattServer({
      maxConnections: this.options.maxConnections,
      autoAcceptConnections: this.options.autoAcceptConnections,
      enableNotifications: this.options.enableNotifications,
      enableIndications: this.options.enableIndications,
    });

    this.advertiser = new Advertiser({
      defaultLocalName: this.options.defaultLocalName,
      autoStart: this.options.autoStart,
      maxAdvertisingTime: this.options.maxAdvertisingTime,
      restartOnFailure: this.options.restartOnFailure,
    });

    this.midiParser = new MidiParser();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // GATT Server events
    this.gattServer.on('clientConnected', (client: ConnectedClient) => {
      this.eventListeners.clientConnected?.(client);
    });

    this.gattServer.on('clientDisconnected', (clientId: string) => {
      this.eventListeners.clientDisconnected?.(clientId);
    });

    this.gattServer.on('characteristicWrite', (request: CharacteristicRequest, data: ArrayBuffer) => {
      this.handleMidiWrite(request.clientId, data);
    });

    this.gattServer.on('error', (error: Error) => {
      this.eventListeners.error?.(error);
    });

    // Advertiser events
    this.advertiser.on('advertisingStarted', () => {
      this.eventListeners.advertisingStarted?.();
    });

    this.advertiser.on('advertisingStopped', () => {
      this.eventListeners.advertisingStopped?.();
    });

    this.advertiser.on('error', (error: Error) => {
      this.eventListeners.error?.(error);
    });
  }

  public on<K extends keyof PeripheralManagerEvents>(event: K, listener: PeripheralManagerEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof PeripheralManagerEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Peripheral Manager already initialized');
      return;
    }

    try {
      // Start GATT server
      await this.gattServer.start();

      // Initialize virtual instruments if enabled
      if (this.options.enableVirtualInstruments) {
        this.initializeVirtualInstruments();
      }

      // Auto-start advertising if enabled
      if (this.options.autoStartAdvertising) {
        await this.startAdvertising();
      }

      this.isInitialized = true;
      console.log('Peripheral Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Peripheral Manager:', error);
      throw error;
    }
  }

  public async startAdvertising(options?: AdvertisingOptions): Promise<void> {
    const advertisingOptions: AdvertisingOptions = {
      localName: this.options.deviceName,
      serviceUUIDs: [MIDI_SERVICE_UUID],
      isConnectable: true,
      ...options
    };

    await this.advertiser.startAdvertising(advertisingOptions);
  }

  public async stopAdvertising(): Promise<void> {
    await this.advertiser.stopAdvertising();
  }

  public async restartAdvertising(options?: AdvertisingOptions): Promise<void> {
    await this.advertiser.restartAdvertising(options);
  }

  // MIDI message handling
  private async handleMidiWrite(clientId: string, data: ArrayBuffer): Promise<void> {
    try {
      const messages = this.midiParser.parseBleMidiPacket(data);

      for (const message of messages) {
        this.eventListeners.midiMessageReceived?.(clientId, message);

        // Process with virtual instruments if enabled
        if (this.options.enableVirtualInstruments) {
          await this.processMessageWithVirtualInstruments(message);
        }
      }

    } catch (error) {
      console.error(`Failed to parse MIDI data from client ${clientId}:`, error);
      this.eventListeners.error?.(error as Error);
    }
  }

  public async sendMidiMessage(message: ParsedMidiMessage, targetClientId?: string): Promise<void> {
    try {
      const packet = this.midiParser.createBleMidiPacket([message], Date.now());

      await this.gattServer.sendNotification(
        MIDI_CHARACTERISTIC_UUID,
        packet.buffer,
        targetClientId
      );

      // Get client info for event
      if (targetClientId) {
        this.eventListeners.midiMessageSent?.(targetClientId, message);
      } else {
        // Broadcast to all connected clients
        const clients = this.gattServer.getConnectedClients();
        clients.forEach(client => {
          this.eventListeners.midiMessageSent?.(client.id, message);
        });
      }

    } catch (error) {
      console.error('Failed to send MIDI message:', error);
      this.eventListeners.error?.(error as Error);
      throw error;
    }
  }

  public async broadcastMidiMessage(message: ParsedMidiMessage): Promise<void> {
    await this.sendMidiMessage(message);
  }

  public async sendControlChange(channel: number, controller: number, value: number, targetClientId?: string): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'controlChange',
      channel,
      timestamp: Date.now(),
      controller,
      value,
      data: new Uint8Array([0xb0 | channel, controller, value])
    };

    await this.sendMidiMessage(message, targetClientId);
  }

  public async sendNoteOn(channel: number, note: number, velocity: number, targetClientId?: string): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'noteOn',
      channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x90 | channel, note, velocity])
    };

    await this.sendMidiMessage(message, targetClientId);
  }

  public async sendNoteOff(channel: number, note: number, velocity: number = 64, targetClientId?: string): Promise<void> {
    const message: ParsedMidiMessage = {
      type: 'noteOff',
      channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x80 | channel, note, velocity])
    };

    await this.sendMidiMessage(message, targetClientId);
  }

  // Virtual instruments
  private initializeVirtualInstruments(): void {
    // Add default virtual instruments
    this.addVirtualInstrument({
      id: 'piano',
      name: 'Virtual Piano',
      type: 'piano',
      channel: 0,
      isActive: true,
      parameters: [
        { id: 'volume', name: 'Volume', type: 'slider', value: 100, min: 0, max: 127, midiController: 7 },
        { id: 'sustain', name: 'Sustain', type: 'toggle', value: 0, min: 0, max: 1, midiController: 64 }
      ]
    });

    this.addVirtualInstrument({
      id: 'controller',
      name: 'MIDI Controller',
      type: 'controller',
      channel: 0,
      isActive: true,
      parameters: [
        { id: 'cc1', name: 'CC 1', type: 'slider', value: 64, min: 0, max: 127, midiController: 1 },
        { id: 'cc2', name: 'CC 2', type: 'slider', value: 64, min: 0, max: 127, midiController: 2 },
        { id: 'cc3', name: 'CC 3', type: 'slider', value: 64, min: 0, max: 127, midiController: 3 },
        { id: 'cc4', name: 'CC 4', type: 'slider', value: 64, min: 0, max: 127, midiController: 4 }
      ]
    });
  }

  public addVirtualInstrument(instrument: VirtualInstrument): void {
    this.virtualInstruments.set(instrument.id, instrument);
  }

  public removeVirtualInstrument(instrumentId: string): void {
    this.virtualInstruments.delete(instrumentId);
  }

  public getVirtualInstruments(): VirtualInstrument[] {
    return Array.from(this.virtualInstruments.values());
  }

  public getVirtualInstrument(instrumentId: string): VirtualInstrument | undefined {
    return this.virtualInstruments.get(instrumentId);
  }

  private async processMessageWithVirtualInstruments(message: ParsedMidiMessage): Promise<void> {
    // This could be extended to process incoming MIDI and trigger virtual instruments
    // For now, it's a placeholder for future functionality
    console.log('Processing MIDI message with virtual instruments:', message);
  }

  // State queries
  public getState(): PeripheralState {
    return {
      isSupported: true, // This would be determined by platform capabilities
      isEnabled: this.isInitialized,
      isAdvertising: this.advertiser.isCurrentlyAdvertising(),
      isGattServerRunning: this.gattServer.isRunning(),
      connectedClientCount: this.gattServer.getConnectedClientCount(),
      maxConnections: this.gattServer.getMaxConnections(),
      advertisingData: this.advertiser.getCurrentAdvertisingData(),
      services: this.gattServer.getServices(),
    };
  }

  public getCapabilities(): PeripheralCapabilities {
    return {
      canAdvertise: true,
      canRunGattServer: true,
      maxConnections: this.options.maxConnections,
      maxServices: 10,
      maxCharacteristicsPerService: 10,
      supportedAdvertisingModes: ['lowPower', 'balanced', 'lowLatency'],
      supportedTxPowerLevels: ['low', 'medium', 'high', 'ultra'],
    };
  }

  public getConnectedClients(): ConnectedClient[] {
    return this.gattServer.getConnectedClients();
  }

  public getConnectedClientCount(): number {
    return this.gattServer.getConnectedClientCount();
  }

  public isAdvertising(): boolean {
    return this.advertiser.isCurrentlyAdvertising();
  }

  public isGattServerRunning(): boolean {
    return this.gattServer.isRunning();
  }

  public canAcceptMoreConnections(): boolean {
    return this.gattServer.canAcceptMoreConnections();
  }

  // Configuration
  public setDeviceName(name: string): void {
    this.options.deviceName = name;
    this.advertiser.setDefaultLocalName(name);
  }

  public getDeviceName(): string {
    return this.options.deviceName;
  }

  public async disconnectClient(clientId: string): Promise<void> {
    await this.gattServer.disconnectClient(clientId);
  }

  public async disconnectAllClients(): Promise<void> {
    await this.gattServer.disconnectAllClients();
  }

  public async shutdown(): Promise<void> {
    try {
      await this.stopAdvertising();
      await this.gattServer.stop();
      this.isInitialized = false;
      console.log('Peripheral Manager shut down successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  public destroy(): void {
    this.shutdown();
    this.gattServer.destroy();
    this.advertiser.destroy();
    this.virtualInstruments.clear();
    this.eventListeners = {};
  }
}