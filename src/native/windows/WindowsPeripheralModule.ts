import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  PlatformPeripheralAdapter,
  PeripheralCapabilities,
  AdvertisingOptions,
  GattService,
  ConnectedClient,
  CharacteristicRequest,
  CharacteristicResponse,
  PeripheralState,
  PeripheralEvent,
  PeripheralEventData
} from '../../types/peripheral';

// Type definition for the native Windows module
interface WindowsPeripheralNativeModule {
  // Capabilities
  getCapabilities(): Promise<PeripheralCapabilities>;
  isSupported(): Promise<boolean>;

  // Advertising
  startAdvertising(options: any): Promise<void>;
  stopAdvertising(): Promise<void>;
  isAdvertising(): Promise<boolean>;

  // GATT Server
  startGattServer(services: any[]): Promise<void>;
  stopGattServer(): Promise<void>;
  addService(service: any): Promise<void>;
  removeService(serviceUuid: string): Promise<void>;

  // Client management
  getConnectedClients(): Promise<any[]>;
  disconnectClient(clientId: string): Promise<void>;

  // Characteristic operations
  sendNotification(clientId: string, serviceUuid: string, characteristicUuid: string, data: string): Promise<void>;
  sendIndication(clientId: string, serviceUuid: string, characteristicUuid: string, data: string): Promise<void>;
  respondToReadRequest(requestId: string, success: boolean, data?: string, status?: string): Promise<void>;
  respondToWriteRequest(requestId: string, success: boolean, status?: string): Promise<void>;

  // State
  getState(): Promise<any>;

  // Constants
  getConstants(): {
    SUPPORTED_EVENTS: string[];
  };
}

export class WindowsPeripheralModule implements PlatformPeripheralAdapter {
  private nativeModule: WindowsPeripheralNativeModule;
  private eventEmitter: NativeEventEmitter;
  private eventListeners: Map<PeripheralEvent, Set<(data: PeripheralEventData) => void>> = new Map();

  constructor() {
    if (Platform.OS !== 'windows') {
      throw new Error('WindowsPeripheralModule can only be used on Windows');
    }

    // Get the native module
    const { WindowsBlePeripheral } = NativeModules;
    if (!WindowsBlePeripheral) {
      throw new Error('WindowsBlePeripheral native module not found. Make sure it is properly linked.');
    }

    this.nativeModule = WindowsBlePeripheral as WindowsPeripheralNativeModule;
    this.eventEmitter = new NativeEventEmitter(WindowsBlePeripheral);

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Initialize event listener maps
    const supportedEvents: PeripheralEvent[] = [
      'advertisingStarted',
      'advertisingStopped',
      'advertisingFailed',
      'clientConnected',
      'clientDisconnected',
      'clientSubscribed',
      'clientUnsubscribed',
      'characteristicReadRequest',
      'characteristicWriteRequest',
      'descriptorReadRequest',
      'descriptorWriteRequest',
      'notificationSent',
      'indicationSent',
      'error'
    ];

    supportedEvents.forEach(event => {
      this.eventListeners.set(event, new Set());
    });

    // Set up native event subscriptions
    this.eventEmitter.addListener('BlePeripheralEvent', (event: any) => {
      this.handleNativeEvent(event);
    });
  }

  private handleNativeEvent(event: any): void {
    const { type, data, error, timestamp } = event;

    const eventData: PeripheralEventData = {
      event: type as PeripheralEvent,
      data: data ? this.parseEventData(type, data) : undefined,
      error: error ? new Error(error) : undefined,
      timestamp: timestamp || Date.now()
    };

    // Emit to registered listeners
    const listeners = this.eventListeners.get(type as PeripheralEvent);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          console.error(`Error in peripheral event listener for ${type}:`, error);
        }
      });
    }
  }

  private parseEventData(eventType: string, data: any): any {
    switch (eventType) {
      case 'clientConnected':
        return this.parseConnectedClient(data);
      case 'characteristicReadRequest':
      case 'characteristicWriteRequest':
        return this.parseCharacteristicRequest(data);
      default:
        return data;
    }
  }

  private parseConnectedClient(data: any): ConnectedClient {
    return {
      id: data.id,
      name: data.name,
      address: data.address,
      connectedAt: data.connectedAt || Date.now(),
      isSubscribed: data.isSubscribed || false,
      mtu: data.mtu || 23
    };
  }

  private parseCharacteristicRequest(data: any): CharacteristicRequest {
    return {
      requestId: data.requestId,
      clientId: data.clientId,
      characteristicUuid: data.characteristicUuid,
      serviceUuid: data.serviceUuid,
      data: data.data ? this.base64ToArrayBuffer(data.data) : undefined,
      offset: data.offset || 0
    };
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  }

  // Implementation of PlatformPeripheralAdapter interface
  public async getCapabilities(): Promise<PeripheralCapabilities> {
    try {
      const capabilities = await this.nativeModule.getCapabilities();
      return capabilities;
    } catch (error) {
      console.error('Failed to get Windows peripheral capabilities:', error);
      // Return default Windows capabilities if native module fails
      return {
        canAdvertise: true,
        canRunGattServer: true,
        maxConnections: 4, // Windows typically supports fewer connections
        maxServices: 5,
        maxCharacteristicsPerService: 8,
        supportedAdvertisingModes: ['balanced'], // Windows has limited advertising mode support
        supportedTxPowerLevels: ['medium'],
      };
    }
  }

  public async isSupported(): Promise<boolean> {
    try {
      return await this.nativeModule.isSupported();
    } catch (error) {
      console.error('Failed to check Windows peripheral support:', error);
      // Windows 10/11 with Bluetooth LE support should work
      return true;
    }
  }

  public async startAdvertising(options: AdvertisingOptions): Promise<void> {
    try {
      const windowsOptions = {
        localName: options.localName,
        serviceUUIDs: options.serviceUUIDs,
        manufacturerData: options.manufacturerData ? this.arrayBufferToBase64(options.manufacturerData) : undefined,
        txPowerLevel: options.txPowerLevel || 'medium', // Windows defaults
        advertisingMode: 'balanced', // Windows typically uses balanced mode
        isConnectable: options.isConnectable !== false,
        timeout: options.timeout
      };

      await this.nativeModule.startAdvertising(windowsOptions);
    } catch (error) {
      console.error('Failed to start Windows advertising:', error);
      throw error;
    }
  }

  public async stopAdvertising(): Promise<void> {
    try {
      await this.nativeModule.stopAdvertising();
    } catch (error) {
      console.error('Failed to stop Windows advertising:', error);
      throw error;
    }
  }

  public async isAdvertising(): Promise<boolean> {
    try {
      return await this.nativeModule.isAdvertising();
    } catch (error) {
      console.error('Failed to check Windows advertising status:', error);
      return false;
    }
  }

  public async startGattServer(services: GattService[]): Promise<void> {
    try {
      const windowsServices = services.map(service => ({
        uuid: service.uuid,
        type: service.type,
        characteristics: service.characteristics.map(char => ({
          uuid: char.uuid,
          properties: char.properties,
          permissions: char.permissions,
          value: char.value ? this.arrayBufferToBase64(char.value) : undefined,
          descriptors: char.descriptors?.map(desc => ({
            uuid: desc.uuid,
            permissions: desc.permissions,
            value: desc.value ? this.arrayBufferToBase64(desc.value) : undefined
          }))
        })),
        includedServices: service.includedServices
      }));

      await this.nativeModule.startGattServer(windowsServices);
    } catch (error) {
      console.error('Failed to start Windows GATT server:', error);
      throw error;
    }
  }

  public async stopGattServer(): Promise<void> {
    try {
      await this.nativeModule.stopGattServer();
    } catch (error) {
      console.error('Failed to stop Windows GATT server:', error);
      throw error;
    }
  }

  public async addService(service: GattService): Promise<void> {
    try {
      const windowsService = {
        uuid: service.uuid,
        type: service.type,
        characteristics: service.characteristics.map(char => ({
          uuid: char.uuid,
          properties: char.properties,
          permissions: char.permissions,
          value: char.value ? this.arrayBufferToBase64(char.value) : undefined
        }))
      };

      await this.nativeModule.addService(windowsService);
    } catch (error) {
      console.error('Failed to add Windows service:', error);
      throw error;
    }
  }

  public async removeService(serviceUuid: string): Promise<void> {
    try {
      await this.nativeModule.removeService(serviceUuid);
    } catch (error) {
      console.error('Failed to remove Windows service:', error);
      throw error;
    }
  }

  public async getConnectedClients(): Promise<ConnectedClient[]> {
    try {
      const clients = await this.nativeModule.getConnectedClients();
      return clients.map((client: any) => this.parseConnectedClient(client));
    } catch (error) {
      console.error('Failed to get Windows connected clients:', error);
      return [];
    }
  }

  public async disconnectClient(clientId: string): Promise<void> {
    try {
      await this.nativeModule.disconnectClient(clientId);
    } catch (error) {
      console.error('Failed to disconnect Windows client:', error);
      throw error;
    }
  }

  public async sendNotification(clientId: string, serviceUuid: string, characteristicUuid: string, data: ArrayBuffer): Promise<void> {
    try {
      const base64Data = this.arrayBufferToBase64(data);
      await this.nativeModule.sendNotification(clientId, serviceUuid, characteristicUuid, base64Data);
    } catch (error) {
      console.error('Failed to send Windows notification:', error);
      throw error;
    }
  }

  public async sendIndication(clientId: string, serviceUuid: string, characteristicUuid: string, data: ArrayBuffer): Promise<void> {
    try {
      const base64Data = this.arrayBufferToBase64(data);
      await this.nativeModule.sendIndication(clientId, serviceUuid, characteristicUuid, base64Data);
    } catch (error) {
      console.error('Failed to send Windows indication:', error);
      throw error;
    }
  }

  public async respondToReadRequest(request: CharacteristicRequest, response: CharacteristicResponse): Promise<void> {
    try {
      const data = response.data ? this.arrayBufferToBase64(response.data) : undefined;
      await this.nativeModule.respondToReadRequest(
        request.requestId,
        response.success,
        data,
        response.status
      );
    } catch (error) {
      console.error('Failed to respond to Windows read request:', error);
      throw error;
    }
  }

  public async respondToWriteRequest(request: CharacteristicRequest, response: CharacteristicResponse): Promise<void> {
    try {
      await this.nativeModule.respondToWriteRequest(
        request.requestId,
        response.success,
        response.status
      );
    } catch (error) {
      console.error('Failed to respond to Windows write request:', error);
      throw error;
    }
  }

  public addEventListener(event: PeripheralEvent, listener: (data: PeripheralEventData) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
  }

  public removeEventListener(event: PeripheralEvent, listener: (data: PeripheralEventData) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  public async getState(): Promise<PeripheralState> {
    try {
      const state = await this.nativeModule.getState();
      return {
        isSupported: state.isSupported,
        isEnabled: state.isEnabled,
        isAdvertising: state.isAdvertising,
        isGattServerRunning: state.isGattServerRunning,
        connectedClientCount: state.connectedClientCount,
        maxConnections: state.maxConnections,
        advertisingData: state.advertisingData,
        services: state.services || []
      };
    } catch (error) {
      console.error('Failed to get Windows peripheral state:', error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      await this.stopAdvertising();
      await this.stopGattServer();

      // Remove all event listeners
      this.eventListeners.forEach(listeners => listeners.clear());
      this.eventListeners.clear();

      // Remove native event subscriptions
      this.eventEmitter.removeAllListeners('BlePeripheralEvent');

    } catch (error) {
      console.error('Error during Windows peripheral cleanup:', error);
      throw error;
    }
  }
}