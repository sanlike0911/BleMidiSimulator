import { EventEmitter } from 'events';
import { CentralManager } from './central-manager';
import { PeripheralManager } from './peripheral-manager';
import { BluetoothMode } from '../../shared/types';

export class ModeController extends EventEmitter {
  private currentMode: BluetoothMode = 'central';
  private centralManager: CentralManager | null = null;
  private peripheralManager: PeripheralManager | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize with central mode by default
    await this.initializeCentralMode();
    this.isInitialized = true;

    console.log('Mode controller initialized in central mode');
  }

  private async initializeCentralMode(): Promise<void> {
    if (this.centralManager) {
      return;
    }

    try {
      this.centralManager = new CentralManager();
      await this.centralManager.initialize();
      this.setupCentralEvents();
      console.log('Central mode initialized');
    } catch (error) {
      console.error('Failed to initialize central mode:', error);
      throw error;
    }
  }

  private async initializePeripheralMode(): Promise<void> {
    if (this.peripheralManager) {
      return;
    }

    try {
      this.peripheralManager = new PeripheralManager();
      await this.peripheralManager.initialize();
      this.setupPeripheralEvents();
      console.log('Peripheral mode initialized');
    } catch (error) {
      console.error('Failed to initialize peripheral mode:', error);
      throw error;
    }
  }

  private setupCentralEvents(): void {
    if (!this.centralManager) return;

    // Forward central events
    this.centralManager.on('stateChange', (state) => {
      this.emit('bluetooth:stateChange', state);
    });

    this.centralManager.on('deviceFound', (device) => {
      this.emit('bluetooth:deviceFound', device);
    });

    this.centralManager.on('connected', (device) => {
      this.emit('bluetooth:connected', device);
    });

    this.centralManager.on('disconnected', () => {
      this.emit('bluetooth:disconnected');
    });

    this.centralManager.on('connectionStateChange', (state) => {
      this.emit('bluetooth:connectionStateChange', state);
    });

    this.centralManager.on('scanStarted', () => {
      this.emit('bluetooth:scanStarted');
    });

    this.centralManager.on('scanStopped', () => {
      this.emit('bluetooth:scanStopped');
    });

    this.centralManager.on('midiMessageReceived', (data) => {
      this.emit('midi:messageReceived', data);
    });

    this.centralManager.on('error', (error) => {
      this.emit('bluetooth:error', error.message);
    });
  }

  private setupPeripheralEvents(): void {
    if (!this.peripheralManager) return;

    // Forward peripheral events
    this.peripheralManager.on('stateChange', (state) => {
      this.emit('bluetooth:stateChange', state);
    });

    this.peripheralManager.on('advertisingStarted', () => {
      this.emit('peripheral:advertisingStarted');
    });

    this.peripheralManager.on('advertisingStopped', () => {
      this.emit('peripheral:advertisingStopped');
    });

    this.peripheralManager.on('advertisingError', (error) => {
      this.emit('bluetooth:error', error);
    });

    this.peripheralManager.on('servicesSet', () => {
      this.emit('peripheral:servicesSet');
    });

    this.peripheralManager.on('servicesError', (error) => {
      this.emit('bluetooth:error', error);
    });

    this.peripheralManager.on('centralConnected', (centralInfo) => {
      this.emit('peripheral:centralConnected', centralInfo);
    });

    this.peripheralManager.on('centralDisconnected', (centralId) => {
      this.emit('peripheral:centralDisconnected', centralId);
    });

    this.peripheralManager.on('midiMessageReceived', (data) => {
      this.emit('midi:messageReceived', data);
    });
  }

  async switchMode(mode: BluetoothMode): Promise<void> {
    if (mode === this.currentMode) {
      console.log(`Already in ${mode} mode`);
      return;
    }

    console.log(`Switching from ${this.currentMode} to ${mode} mode`);

    try {
      // Cleanup current mode
      await this.cleanupCurrentMode();

      // Switch to new mode
      this.currentMode = mode;

      if (mode === 'central') {
        await this.initializeCentralMode();
      } else {
        await this.initializePeripheralMode();
      }

      this.emit('mode:changed', mode);
      console.log(`Successfully switched to ${mode} mode`);

    } catch (error) {
      console.error(`Failed to switch to ${mode} mode:`, error);
      // Try to revert to previous mode
      try {
        this.currentMode = this.currentMode === 'central' ? 'peripheral' : 'central';
        if (this.currentMode === 'central') {
          await this.initializeCentralMode();
        } else {
          await this.initializePeripheralMode();
        }
      } catch (revertError) {
        console.error('Failed to revert to previous mode:', revertError);
      }
      throw error;
    }
  }

  private async cleanupCurrentMode(): Promise<void> {
    if (this.currentMode === 'central' && this.centralManager) {
      try {
        await this.centralManager.cleanup();
        this.centralManager.removeAllListeners();
        this.centralManager = null;
      } catch (error) {
        console.error('Error cleaning up central mode:', error);
      }
    } else if (this.currentMode === 'peripheral' && this.peripheralManager) {
      try {
        await this.peripheralManager.cleanup();
        this.peripheralManager.removeAllListeners();
        this.peripheralManager = null;
      } catch (error) {
        console.error('Error cleaning up peripheral mode:', error);
      }
    }
  }

  getCurrentMode(): BluetoothMode {
    return this.currentMode;
  }

  getCentralManager(): CentralManager | null {
    return this.currentMode === 'central' ? this.centralManager : null;
  }

  getPeripheralManager(): PeripheralManager | null {
    return this.currentMode === 'peripheral' ? this.peripheralManager : null;
  }

  isConnected(): boolean {
    if (this.currentMode === 'central' && this.centralManager) {
      return this.centralManager.isConnected();
    } else if (this.currentMode === 'peripheral' && this.peripheralManager) {
      return this.peripheralManager.getConnectedCentrals().length > 0;
    }
    return false;
  }

  async sendMidiMessage(message: Uint8Array): Promise<void> {
    if (this.currentMode === 'central' && this.centralManager) {
      return this.centralManager.sendMidiMessage(message);
    } else if (this.currentMode === 'peripheral' && this.peripheralManager) {
      return this.peripheralManager.sendMidiMessage(message);
    } else {
      throw new Error(`Cannot send MIDI message: ${this.currentMode} mode not available`);
    }
  }

  async cleanup(): Promise<void> {
    await this.cleanupCurrentMode();
    this.removeAllListeners();
    this.isInitialized = false;
    console.log('Mode controller cleaned up');
  }
}