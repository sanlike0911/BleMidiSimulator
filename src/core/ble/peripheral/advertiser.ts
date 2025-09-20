import {
  AdvertisingData,
  AdvertisingOptions,
  PeripheralEvent,
  PeripheralEventData
} from '../../../types/peripheral';
import { MIDI_SERVICE_UUID } from '../../../constants/midi';

export interface AdvertiserOptions {
  defaultLocalName?: string;
  autoStart?: boolean;
  maxAdvertisingTime?: number;
  restartOnFailure?: boolean;
}

export interface AdvertiserEvents {
  advertisingStarted: (data: AdvertisingData) => void;
  advertisingStopped: () => void;
  advertisingFailed: (error: Error) => void;
  error: (error: Error) => void;
}

export class Advertiser {
  private isAdvertising: boolean = false;
  private currentAdvertisingData?: AdvertisingData;
  private options: Required<AdvertiserOptions>;
  private eventListeners: Partial<AdvertiserEvents> = {};
  private advertisingTimeout?: NodeJS.Timeout;

  constructor(options?: AdvertiserOptions) {
    this.options = {
      defaultLocalName: options?.defaultLocalName || 'BLE MIDI Simulator',
      autoStart: options?.autoStart || false,
      maxAdvertisingTime: options?.maxAdvertisingTime || 0, // 0 = indefinite
      restartOnFailure: options?.restartOnFailure || true,
    };
  }

  public on<K extends keyof AdvertiserEvents>(event: K, listener: AdvertiserEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof AdvertiserEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  public async startAdvertising(options?: AdvertisingOptions): Promise<void> {
    if (this.isAdvertising) {
      console.log('Already advertising');
      return;
    }

    try {
      const advertisingData = this.createAdvertisingData(options);

      // Validate advertising data
      this.validateAdvertisingData(advertisingData);

      // Start advertising with platform-specific implementation
      await this.performStartAdvertising(advertisingData);

      this.isAdvertising = true;
      this.currentAdvertisingData = advertisingData;

      // Set timeout if specified
      if (this.options.maxAdvertisingTime > 0) {
        this.advertisingTimeout = setTimeout(() => {
          this.stopAdvertising();
        }, this.options.maxAdvertisingTime);
      }

      this.eventListeners.advertisingStarted?.(advertisingData);
      console.log(`Started advertising as: ${advertisingData.localName}`);

    } catch (error) {
      console.error('Failed to start advertising:', error);
      this.eventListeners.advertisingFailed?.(error as Error);
      this.eventListeners.error?.(error as Error);
      throw error;
    }
  }

  public async stopAdvertising(): Promise<void> {
    if (!this.isAdvertising) {
      console.log('Not currently advertising');
      return;
    }

    try {
      // Clear timeout
      if (this.advertisingTimeout) {
        clearTimeout(this.advertisingTimeout);
        this.advertisingTimeout = undefined;
      }

      // Stop advertising with platform-specific implementation
      await this.performStopAdvertising();

      this.isAdvertising = false;
      this.currentAdvertisingData = undefined;

      this.eventListeners.advertisingStopped?.();
      console.log('Stopped advertising');

    } catch (error) {
      console.error('Failed to stop advertising:', error);
      this.eventListeners.error?.(error as Error);
      throw error;
    }
  }

  public async restartAdvertising(options?: AdvertisingOptions): Promise<void> {
    if (this.isAdvertising) {
      await this.stopAdvertising();
    }
    await this.startAdvertising(options);
  }

  private createAdvertisingData(options?: AdvertisingOptions): AdvertisingData {
    return {
      localName: options?.localName || this.options.defaultLocalName,
      serviceUUIDs: options?.serviceUUIDs || [MIDI_SERVICE_UUID],
      manufacturerData: options?.manufacturerData,
      txPowerLevel: this.mapTxPowerLevel(options?.txPowerLevel),
      isConnectable: options?.isConnectable !== false, // Default to true
    };
  }

  private mapTxPowerLevel(level?: 'low' | 'medium' | 'high' | 'ultra'): number {
    switch (level) {
      case 'low':
        return -20; // dBm
      case 'medium':
        return -12;
      case 'high':
        return -4;
      case 'ultra':
        return 4;
      default:
        return -12; // Medium as default
    }
  }

  private validateAdvertisingData(data: AdvertisingData): void {
    // Check local name length (must be <= 29 bytes for compatibility)
    if (data.localName.length > 29) {
      throw new Error(`Local name too long: ${data.localName.length} bytes (max 29)`);
    }

    // Check service UUIDs
    if (data.serviceUUIDs.length === 0) {
      throw new Error('At least one service UUID is required');
    }

    // Validate UUID format
    for (const uuid of data.serviceUUIDs) {
      if (!this.isValidUUID(uuid)) {
        throw new Error(`Invalid UUID format: ${uuid}`);
      }
    }

    // Check manufacturer data length
    if (data.manufacturerData && data.manufacturerData.byteLength > 25) {
      throw new Error(`Manufacturer data too long: ${data.manufacturerData.byteLength} bytes (max 25)`);
    }

    // Check total advertising data length
    const estimatedLength = this.estimateAdvertisingDataLength(data);
    if (estimatedLength > 31) {
      throw new Error(`Advertising data too long: estimated ${estimatedLength} bytes (max 31)`);
    }
  }

  private isValidUUID(uuid: string): boolean {
    // Check for standard UUID format (8-4-4-4-12) or 16-bit/32-bit UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const shortUuidRegex = /^[0-9a-f]{4}$/i;
    const longShortUuidRegex = /^[0-9a-f]{8}$/i;

    return uuidRegex.test(uuid) || shortUuidRegex.test(uuid) || longShortUuidRegex.test(uuid);
  }

  private estimateAdvertisingDataLength(data: AdvertisingData): number {
    let length = 0;

    // Flags (3 bytes: length + type + flags)
    length += 3;

    // Local name (length + type + name)
    if (data.localName) {
      length += 2 + data.localName.length;
    }

    // Service UUIDs (length + type + UUIDs)
    if (data.serviceUUIDs.length > 0) {
      // Assuming 128-bit UUIDs (16 bytes each)
      length += 2 + (data.serviceUUIDs.length * 16);
    }

    // TX Power Level (3 bytes: length + type + power)
    if (data.txPowerLevel !== undefined) {
      length += 3;
    }

    // Manufacturer data (length + type + data)
    if (data.manufacturerData) {
      length += 2 + data.manufacturerData.byteLength;
    }

    return length;
  }

  // Platform-specific implementations (to be overridden by platform adapters)
  protected async performStartAdvertising(data: AdvertisingData): Promise<void> {
    // This would be implemented by platform-specific adapters
    console.log('Starting advertising with data:', data);

    // Simulate advertising start
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  protected async performStopAdvertising(): Promise<void> {
    // This would be implemented by platform-specific adapters
    console.log('Stopping advertising');

    // Simulate advertising stop
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Public state queries
  public isCurrentlyAdvertising(): boolean {
    return this.isAdvertising;
  }

  public getCurrentAdvertisingData(): AdvertisingData | undefined {
    return this.currentAdvertisingData;
  }

  public getRemainingAdvertisingTime(): number {
    if (!this.isAdvertising || this.options.maxAdvertisingTime === 0) {
      return -1; // Indefinite
    }

    // This would need to track actual start time
    return this.options.maxAdvertisingTime;
  }

  // Configuration methods
  public setDefaultLocalName(name: string): void {
    this.options.defaultLocalName = name;
  }

  public getDefaultLocalName(): string {
    return this.options.defaultLocalName;
  }

  public setMaxAdvertisingTime(time: number): void {
    this.options.maxAdvertisingTime = time;
  }

  public getMaxAdvertisingTime(): number {
    return this.options.maxAdvertisingTime;
  }

  // Error handling
  public async handleAdvertisingFailure(error: Error): Promise<void> {
    console.error('Advertising failure:', error);

    this.isAdvertising = false;
    this.currentAdvertisingData = undefined;

    if (this.advertisingTimeout) {
      clearTimeout(this.advertisingTimeout);
      this.advertisingTimeout = undefined;
    }

    this.eventListeners.advertisingFailed?.(error);

    // Auto-restart if enabled
    if (this.options.restartOnFailure) {
      console.log('Attempting to restart advertising after failure...');
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await this.startAdvertising();
      } catch (restartError) {
        console.error('Failed to restart advertising:', restartError);
        this.eventListeners.error?.(restartError as Error);
      }
    }
  }

  public destroy(): void {
    this.stopAdvertising();
    this.eventListeners = {};

    if (this.advertisingTimeout) {
      clearTimeout(this.advertisingTimeout);
      this.advertisingTimeout = undefined;
    }
  }
}