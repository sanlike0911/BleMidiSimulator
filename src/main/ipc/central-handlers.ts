import { ipcMain, BrowserWindow } from 'electron';
import { CentralManager } from '../bluetooth/central-manager';
import { BluetoothDevice } from '../../shared/types';

let centralManager: CentralManager | null = null;

export function initializeCentralHandlers() {
  // Initialize central manager
  ipcMain.handle('central:initialize', async () => {
    try {
      if (!centralManager) {
        centralManager = new CentralManager();
        setupCentralEvents();
      }
      await centralManager.initialize();
      return true;
    } catch (error) {
      console.error('Failed to initialize central manager:', error);
      throw error;
    }
  });

  // Check if central is available
  ipcMain.handle('central:isAvailable', async () => {
    try {
      // Check if noble is available
      return true; // For now, assume it's always available
    } catch (error) {
      console.error('Central not available:', error);
      return false;
    }
  });

  // Start scanning
  ipcMain.handle('central:startScan', async (event, nameFilter?: string) => {
    try {
      if (!centralManager) {
        throw new Error('Central manager not initialized');
      }
      await centralManager.startScan(nameFilter);
      return true;
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  });

  // Stop scanning
  ipcMain.handle('central:stopScan', async () => {
    try {
      if (!centralManager) {
        throw new Error('Central manager not initialized');
      }
      await centralManager.stopScan();
      return true;
    } catch (error) {
      console.error('Failed to stop scan:', error);
      throw error;
    }
  });

  // Connect to device
  ipcMain.handle('central:connect', async (event, deviceId: string) => {
    try {
      if (!centralManager) {
        throw new Error('Central manager not initialized');
      }
      await centralManager.connect(deviceId);
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  });

  // Disconnect from device
  ipcMain.handle('central:disconnect', async () => {
    try {
      if (!centralManager) {
        throw new Error('Central manager not initialized');
      }
      await centralManager.disconnect();
      return true;
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  });

  // Send MIDI message
  ipcMain.handle('central:sendMidiMessage', async (event, message: Uint8Array) => {
    try {
      if (!centralManager) {
        throw new Error('Central manager not initialized');
      }
      await centralManager.sendMidiMessage(message);
      return true;
    } catch (error) {
      console.error('Failed to send MIDI message:', error);
      throw error;
    }
  });

  // Get connection state
  ipcMain.handle('central:getConnectionState', async () => {
    try {
      if (!centralManager) {
        return 'disconnected';
      }
      return centralManager.getConnectionState();
    } catch (error) {
      console.error('Failed to get connection state:', error);
      return 'disconnected';
    }
  });

  // Cleanup
  ipcMain.handle('central:cleanup', async () => {
    try {
      if (centralManager) {
        await centralManager.cleanup();
        centralManager = null;
      }
      return true;
    } catch (error) {
      console.error('Failed to cleanup central manager:', error);
      throw error;
    }
  });
}

function setupCentralEvents() {
  if (!centralManager) return;

  const sendToRenderer = (channel: string, ...args: any[]) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  centralManager.on('stateChange', (state: string) => {
    sendToRenderer('bluetooth:stateChange', state);
  });

  centralManager.on('deviceFound', (device: BluetoothDevice) => {
    sendToRenderer('bluetooth:deviceFound', device);
  });

  centralManager.on('connected', (device: BluetoothDevice) => {
    sendToRenderer('bluetooth:connected', device);
  });

  centralManager.on('disconnected', () => {
    sendToRenderer('bluetooth:disconnected');
  });

  centralManager.on('connectionStateChange', (state: string) => {
    sendToRenderer('bluetooth:connectionStateChange', state);
  });

  centralManager.on('scanStarted', () => {
    sendToRenderer('bluetooth:scanStarted');
  });

  centralManager.on('scanStopped', () => {
    sendToRenderer('bluetooth:scanStopped');
  });

  centralManager.on('midiMessageReceived', (data: Uint8Array) => {
    sendToRenderer('midi:messageReceived', data);
  });

  centralManager.on('error', (error: Error) => {
    sendToRenderer('bluetooth:error', error.message);
  });
}

export function getCentralManager(): CentralManager | null {
  return centralManager;
}