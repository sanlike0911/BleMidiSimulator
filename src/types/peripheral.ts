// BLE Peripheral Types

export interface PeripheralDevice {
  id: string;
  name: string;
  isAdvertising: boolean;
  isGattServerRunning: boolean;
  connectedClients: ConnectedClient[];
  advertisingData: AdvertisingData;
}

export interface ConnectedClient {
  id: string;
  name?: string;
  address: string;
  connectedAt: number;
  isSubscribed: boolean;
  mtu: number;
}

export interface AdvertisingData {
  localName: string;
  serviceUUIDs: string[];
  manufacturerData?: ArrayBuffer;
  txPowerLevel?: number;
  isConnectable: boolean;
}

export interface AdvertisingOptions {
  localName?: string;
  serviceUUIDs?: string[];
  manufacturerData?: ArrayBuffer;
  txPowerLevel?: 'low' | 'medium' | 'high' | 'ultra';
  advertisingMode?: 'lowPower' | 'balanced' | 'lowLatency';
  isConnectable?: boolean;
  timeout?: number;
}

export interface GattService {
  uuid: string;
  type: 'primary' | 'secondary';
  characteristics: GattCharacteristic[];
  includedServices?: string[];
}

export interface GattCharacteristic {
  uuid: string;
  properties: CharacteristicProperty[];
  permissions: CharacteristicPermission[];
  value?: ArrayBuffer;
  descriptors?: GattDescriptor[];
}

export interface GattDescriptor {
  uuid: string;
  permissions: DescriptorPermission[];
  value?: ArrayBuffer;
}

export type CharacteristicProperty =
  | 'read'
  | 'write'
  | 'writeWithoutResponse'
  | 'notify'
  | 'indicate'
  | 'authenticatedSignedWrites'
  | 'extendedProperties'
  | 'notifyEncryptionRequired'
  | 'indicateEncryptionRequired';

export type CharacteristicPermission =
  | 'readable'
  | 'writeable'
  | 'readEncryptionRequired'
  | 'writeEncryptionRequired';

export type DescriptorPermission =
  | 'readable'
  | 'writeable'
  | 'readEncryptionRequired'
  | 'writeEncryptionRequired';

export interface CharacteristicRequest {
  requestId: string;
  clientId: string;
  characteristicUuid: string;
  serviceUuid: string;
  data?: ArrayBuffer;
  offset?: number;
}

export interface CharacteristicResponse {
  requestId: string;
  success: boolean;
  data?: ArrayBuffer;
  status?: GattStatus;
}

export type GattStatus =
  | 'success'
  | 'readNotPermitted'
  | 'writeNotPermitted'
  | 'insufficientAuthentication'
  | 'requestNotSupported'
  | 'invalidOffset'
  | 'invalidAttributeLength'
  | 'insufficientEncryption'
  | 'failure';

export interface PeripheralState {
  isSupported: boolean;
  isEnabled: boolean;
  isAdvertising: boolean;
  isGattServerRunning: boolean;
  connectedClientCount: number;
  maxConnections: number;
  advertisingData?: AdvertisingData;
  services: GattService[];
}

export interface PeripheralCapabilities {
  canAdvertise: boolean;
  canRunGattServer: boolean;
  maxConnections: number;
  maxServices: number;
  maxCharacteristicsPerService: number;
  supportedAdvertisingModes: string[];
  supportedTxPowerLevels: string[];
}

// Events
export type PeripheralEvent =
  | 'advertisingStarted'
  | 'advertisingStopped'
  | 'advertisingFailed'
  | 'clientConnected'
  | 'clientDisconnected'
  | 'clientSubscribed'
  | 'clientUnsubscribed'
  | 'characteristicReadRequest'
  | 'characteristicWriteRequest'
  | 'descriptorReadRequest'
  | 'descriptorWriteRequest'
  | 'notificationSent'
  | 'indicationSent'
  | 'error';

export interface PeripheralEventData {
  event: PeripheralEvent;
  data?: any;
  error?: Error;
  timestamp: number;
}

// Platform-specific peripheral adapter interface
export interface PlatformPeripheralAdapter {
  // Capabilities
  getCapabilities(): Promise<PeripheralCapabilities>;
  isSupported(): Promise<boolean>;

  // Advertising
  startAdvertising(options: AdvertisingOptions): Promise<void>;
  stopAdvertising(): Promise<void>;
  isAdvertising(): Promise<boolean>;

  // GATT Server
  startGattServer(services: GattService[]): Promise<void>;
  stopGattServer(): Promise<void>;
  addService(service: GattService): Promise<void>;
  removeService(serviceUuid: string): Promise<void>;

  // Client management
  getConnectedClients(): Promise<ConnectedClient[]>;
  disconnectClient(clientId: string): Promise<void>;

  // Characteristic operations
  sendNotification(clientId: string, serviceUuid: string, characteristicUuid: string, data: ArrayBuffer): Promise<void>;
  sendIndication(clientId: string, serviceUuid: string, characteristicUuid: string, data: ArrayBuffer): Promise<void>;
  respondToReadRequest(request: CharacteristicRequest, response: CharacteristicResponse): Promise<void>;
  respondToWriteRequest(request: CharacteristicRequest, response: CharacteristicResponse): Promise<void>;

  // Event handling
  addEventListener(event: PeripheralEvent, listener: (data: PeripheralEventData) => void): void;
  removeEventListener(event: PeripheralEvent, listener: (data: PeripheralEventData) => void): void;

  // State
  getState(): Promise<PeripheralState>;

  // Cleanup
  destroy(): Promise<void>;
}

// Virtual MIDI Instrument Types
export interface VirtualInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  channel: number;
  isActive: boolean;
  parameters: InstrumentParameter[];
}

export type InstrumentType =
  | 'piano'
  | 'synthesizer'
  | 'drumKit'
  | 'arpeggiator'
  | 'sequencer'
  | 'controller';

export interface InstrumentParameter {
  id: string;
  name: string;
  type: 'slider' | 'knob' | 'button' | 'toggle' | 'select';
  value: number;
  min: number;
  max: number;
  step?: number;
  midiController?: number;
}

export interface NoteEvent {
  note: number;
  velocity: number;
  channel: number;
  timestamp: number;
  duration?: number;
}

export interface ControlEvent {
  controller: number;
  value: number;
  channel: number;
  timestamp: number;
}