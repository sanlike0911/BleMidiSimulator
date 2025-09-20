import {
  GattService,
  GattCharacteristic,
  ConnectedClient,
  CharacteristicRequest,
  CharacteristicResponse,
  GattStatus,
  PeripheralEvent,
  PeripheralEventData
} from '../../../types/peripheral';
import { MIDI_SERVICE_UUID, MIDI_CHARACTERISTIC_UUID } from '../../../constants/midi';

export interface GattServerOptions {
  maxConnections?: number;
  autoAcceptConnections?: boolean;
  enableNotifications?: boolean;
  enableIndications?: boolean;
}

export interface GattServerEvents {
  clientConnected: (client: ConnectedClient) => void;
  clientDisconnected: (clientId: string) => void;
  characteristicRead: (request: CharacteristicRequest) => void;
  characteristicWrite: (request: CharacteristicRequest, data: ArrayBuffer) => void;
  clientSubscribed: (clientId: string, characteristicUuid: string) => void;
  clientUnsubscribed: (clientId: string, characteristicUuid: string) => void;
  error: (error: Error) => void;
}

export class GattServer {
  private services: Map<string, GattService> = new Map();
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // characteristicUuid -> Set<clientId>
  private eventListeners: Partial<GattServerEvents> = {};
  private options: Required<GattServerOptions>;
  private isRunning: boolean = false;

  constructor(options?: GattServerOptions) {
    this.options = {
      maxConnections: options?.maxConnections || 8,
      autoAcceptConnections: options?.autoAcceptConnections || true,
      enableNotifications: options?.enableNotifications || true,
      enableIndications: options?.enableIndications || false,
    };
  }

  public on<K extends keyof GattServerEvents>(event: K, listener: GattServerEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof GattServerEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('GATT Server is already running');
      return;
    }

    try {
      // Initialize MIDI service by default
      await this.addMidiService();

      this.isRunning = true;
      console.log('GATT Server started successfully');

    } catch (error) {
      console.error('Failed to start GATT Server:', error);
      this.eventListeners.error?.(error as Error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('GATT Server is not running');
      return;
    }

    try {
      // Disconnect all clients
      await this.disconnectAllClients();

      // Clear services
      this.services.clear();
      this.subscriptions.clear();

      this.isRunning = false;
      console.log('GATT Server stopped successfully');

    } catch (error) {
      console.error('Failed to stop GATT Server:', error);
      this.eventListeners.error?.(error as Error);
      throw error;
    }
  }

  private async addMidiService(): Promise<void> {
    const midiCharacteristic: GattCharacteristic = {
      uuid: MIDI_CHARACTERISTIC_UUID,
      properties: ['read', 'write', 'writeWithoutResponse', 'notify'],
      permissions: ['readable', 'writeable'],
      value: new ArrayBuffer(0),
    };

    const midiService: GattService = {
      uuid: MIDI_SERVICE_UUID,
      type: 'primary',
      characteristics: [midiCharacteristic],
    };

    await this.addService(midiService);
  }

  public async addService(service: GattService): Promise<void> {
    if (this.services.has(service.uuid)) {
      throw new Error(`Service ${service.uuid} already exists`);
    }

    this.services.set(service.uuid, service);

    // Initialize subscriptions for notifiable characteristics
    for (const characteristic of service.characteristics) {
      if (characteristic.properties.includes('notify') || characteristic.properties.includes('indicate')) {
        this.subscriptions.set(characteristic.uuid, new Set());
      }
    }

    console.log(`Added service: ${service.uuid}`);
  }

  public async removeService(serviceUuid: string): Promise<void> {
    const service = this.services.get(serviceUuid);
    if (!service) {
      console.warn(`Service ${serviceUuid} not found`);
      return;
    }

    // Remove subscriptions for this service's characteristics
    for (const characteristic of service.characteristics) {
      this.subscriptions.delete(characteristic.uuid);
    }

    this.services.delete(serviceUuid);
    console.log(`Removed service: ${serviceUuid}`);
  }

  public getServices(): GattService[] {
    return Array.from(this.services.values());
  }

  public getService(serviceUuid: string): GattService | undefined {
    return this.services.get(serviceUuid);
  }

  public getCharacteristic(serviceUuid: string, characteristicUuid: string): GattCharacteristic | undefined {
    const service = this.services.get(serviceUuid);
    if (!service) {
      return undefined;
    }

    return service.characteristics.find(char => char.uuid === characteristicUuid);
  }

  // Client management
  public async handleClientConnected(client: ConnectedClient): Promise<void> {
    if (this.connectedClients.size >= this.options.maxConnections) {
      console.warn(`Maximum connections (${this.options.maxConnections}) reached. Rejecting connection.`);
      return;
    }

    this.connectedClients.set(client.id, client);
    this.eventListeners.clientConnected?.(client);
    console.log(`Client connected: ${client.id} (${client.name || 'Unknown'})`);
  }

  public async handleClientDisconnected(clientId: string): Promise<void> {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      console.warn(`Client ${clientId} not found`);
      return;
    }

    // Remove client from all subscriptions
    for (const [characteristicUuid, subscribers] of this.subscriptions) {
      if (subscribers.has(clientId)) {
        subscribers.delete(clientId);
        this.eventListeners.clientUnsubscribed?.(clientId, characteristicUuid);
      }
    }

    this.connectedClients.delete(clientId);
    this.eventListeners.clientDisconnected?.(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }

  public async disconnectClient(clientId: string): Promise<void> {
    await this.handleClientDisconnected(clientId);
  }

  public async disconnectAllClients(): Promise<void> {
    const clientIds = Array.from(this.connectedClients.keys());
    for (const clientId of clientIds) {
      await this.disconnectClient(clientId);
    }
  }

  public getConnectedClients(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  public getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  public isClientConnected(clientId: string): boolean {
    return this.connectedClients.has(clientId);
  }

  // Characteristic operations
  public async handleCharacteristicReadRequest(request: CharacteristicRequest): Promise<CharacteristicResponse> {
    const characteristic = this.getCharacteristic(request.serviceUuid, request.characteristicUuid);

    if (!characteristic) {
      return {
        requestId: request.requestId,
        success: false,
        status: 'requestNotSupported',
      };
    }

    if (!characteristic.properties.includes('read')) {
      return {
        requestId: request.requestId,
        success: false,
        status: 'readNotPermitted',
      };
    }

    try {
      // Emit event for application to handle
      this.eventListeners.characteristicRead?.(request);

      // Return current value
      return {
        requestId: request.requestId,
        success: true,
        data: characteristic.value,
        status: 'success',
      };

    } catch (error) {
      console.error(`Failed to handle read request for ${request.characteristicUuid}:`, error);
      return {
        requestId: request.requestId,
        success: false,
        status: 'failure',
      };
    }
  }

  public async handleCharacteristicWriteRequest(request: CharacteristicRequest): Promise<CharacteristicResponse> {
    const characteristic = this.getCharacteristic(request.serviceUuid, request.characteristicUuid);

    if (!characteristic) {
      return {
        requestId: request.requestId,
        success: false,
        status: 'requestNotSupported',
      };
    }

    const canWrite = characteristic.properties.includes('write') ||
                     characteristic.properties.includes('writeWithoutResponse');

    if (!canWrite) {
      return {
        requestId: request.requestId,
        success: false,
        status: 'writeNotPermitted',
      };
    }

    try {
      if (request.data) {
        // Update characteristic value
        characteristic.value = request.data;

        // Emit event for application to handle
        this.eventListeners.characteristicWrite?.(request, request.data);
      }

      return {
        requestId: request.requestId,
        success: true,
        status: 'success',
      };

    } catch (error) {
      console.error(`Failed to handle write request for ${request.characteristicUuid}:`, error);
      return {
        requestId: request.requestId,
        success: false,
        status: 'failure',
      };
    }
  }

  // Subscription management
  public async handleClientSubscribed(clientId: string, characteristicUuid: string): Promise<void> {
    const subscribers = this.subscriptions.get(characteristicUuid);
    if (!subscribers) {
      console.warn(`Characteristic ${characteristicUuid} does not support subscriptions`);
      return;
    }

    subscribers.add(clientId);

    // Update client subscription status
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.isSubscribed = true;
    }

    this.eventListeners.clientSubscribed?.(clientId, characteristicUuid);
    console.log(`Client ${clientId} subscribed to ${characteristicUuid}`);
  }

  public async handleClientUnsubscribed(clientId: string, characteristicUuid: string): Promise<void> {
    const subscribers = this.subscriptions.get(characteristicUuid);
    if (!subscribers) {
      return;
    }

    subscribers.delete(clientId);

    // Update client subscription status
    const client = this.connectedClients.get(clientId);
    if (client) {
      // Check if client is still subscribed to any characteristic
      client.isSubscribed = Array.from(this.subscriptions.values()).some(subs => subs.has(clientId));
    }

    this.eventListeners.clientUnsubscribed?.(clientId, characteristicUuid);
    console.log(`Client ${clientId} unsubscribed from ${characteristicUuid}`);
  }

  // Notification/Indication sending
  public async sendNotification(characteristicUuid: string, data: ArrayBuffer, targetClientId?: string): Promise<void> {
    const subscribers = this.subscriptions.get(characteristicUuid);
    if (!subscribers || subscribers.size === 0) {
      console.warn(`No subscribers for characteristic ${characteristicUuid}`);
      return;
    }

    const clientIds = targetClientId ? [targetClientId] : Array.from(subscribers);

    for (const clientId of clientIds) {
      if (subscribers.has(clientId) && this.connectedClients.has(clientId)) {
        try {
          // This would be implemented by the platform-specific adapter
          console.log(`Sending notification to client ${clientId} for ${characteristicUuid}`);
          // await this.platformAdapter.sendNotification(clientId, serviceUuid, characteristicUuid, data);
        } catch (error) {
          console.error(`Failed to send notification to client ${clientId}:`, error);
        }
      }
    }
  }

  public async sendIndication(characteristicUuid: string, data: ArrayBuffer, targetClientId?: string): Promise<void> {
    // Similar to sendNotification but requires confirmation
    const subscribers = this.subscriptions.get(characteristicUuid);
    if (!subscribers || subscribers.size === 0) {
      console.warn(`No subscribers for characteristic ${characteristicUuid}`);
      return;
    }

    const clientIds = targetClientId ? [targetClientId] : Array.from(subscribers);

    for (const clientId of clientIds) {
      if (subscribers.has(clientId) && this.connectedClients.has(clientId)) {
        try {
          console.log(`Sending indication to client ${clientId} for ${characteristicUuid}`);
          // await this.platformAdapter.sendIndication(clientId, serviceUuid, characteristicUuid, data);
        } catch (error) {
          console.error(`Failed to send indication to client ${clientId}:`, error);
        }
      }
    }
  }

  public getSubscribers(characteristicUuid: string): string[] {
    const subscribers = this.subscriptions.get(characteristicUuid);
    return subscribers ? Array.from(subscribers) : [];
  }

  public isClientSubscribed(clientId: string, characteristicUuid: string): boolean {
    const subscribers = this.subscriptions.get(characteristicUuid);
    return subscribers ? subscribers.has(clientId) : false;
  }

  // State queries
  public isRunning(): boolean {
    return this.isRunning;
  }

  public getMaxConnections(): number {
    return this.options.maxConnections;
  }

  public canAcceptMoreConnections(): boolean {
    return this.connectedClients.size < this.options.maxConnections;
  }

  public destroy(): void {
    this.stop();
    this.services.clear();
    this.connectedClients.clear();
    this.subscriptions.clear();
    this.eventListeners = {};
  }
}