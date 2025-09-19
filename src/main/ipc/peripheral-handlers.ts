import { ipcMain, BrowserWindow } from 'electron';
import { PeripheralManager } from '../bluetooth/peripheral-manager';
import { CentralInfo } from '../../shared/types';

let peripheralManager: PeripheralManager | null = null;

export function initializePeripheralHandlers() {
  // Initialize peripheral manager
  ipcMain.handle('peripheral:initialize', async () => {
    try {
      if (!peripheralManager) {
        peripheralManager = new PeripheralManager();
        setupPeripheralEvents();
      }
      await peripheralManager.initialize();
      return true;
    } catch (error) {
      console.error('Failed to initialize peripheral manager:', error);
      throw error;
    }
  });

  // Check if peripheral is available
  ipcMain.handle('peripheral:isAvailable', async () => {
    try {
      // Check if bleno is available
      return true; // For now, assume it's always available
    } catch (error) {
      console.error('Peripheral not available:', error);
      return false;
    }
  });

  // Start advertising
  ipcMain.handle('peripheral:startAdvertising', async (event, deviceName?: string) => {
    try {
      if (!peripheralManager) {
        throw new Error('Peripheral manager not initialized');
      }
      await peripheralManager.startAdvertising(deviceName);
      return true;
    } catch (error) {
      console.error('Failed to start advertising:', error);
      throw error;
    }
  });

  // Stop advertising
  ipcMain.handle('peripheral:stopAdvertising', async () => {
    try {
      if (!peripheralManager) {
        throw new Error('Peripheral manager not initialized');
      }
      await peripheralManager.stopAdvertising();
      return true;
    } catch (error) {
      console.error('Failed to stop advertising:', error);
      throw error;
    }
  });

  // Get connected centrals
  ipcMain.handle('peripheral:getConnectedCentrals', async () => {
    try {
      if (!peripheralManager) {
        return [];
      }
      return peripheralManager.getConnectedCentrals();
    } catch (error) {
      console.error('Failed to get connected centrals:', error);
      return [];
    }
  });

  // Disconnect central
  ipcMain.handle('peripheral:disconnectCentral', async (event, centralId: string) => {
    try {
      if (!peripheralManager) {
        throw new Error('Peripheral manager not initialized');
      }
      await peripheralManager.disconnectCentral(centralId);
      return true;
    } catch (error) {
      console.error('Failed to disconnect central:', error);
      throw error;
    }
  });

  // Send MIDI message (as peripheral)
  ipcMain.handle('peripheral:sendMidiMessage', async (event, message: Uint8Array) => {
    try {
      if (!peripheralManager) {
        throw new Error('Peripheral manager not initialized');
      }
      await peripheralManager.sendMidiMessage(message);
      return true;
    } catch (error) {
      console.error('Failed to send MIDI message from peripheral:', error);
      throw error;
    }
  });

  // Get advertising status
  ipcMain.handle('peripheral:getAdvertisingStatus', async () => {
    try {
      if (!peripheralManager) {
        return false;
      }
      return peripheralManager.isAdvertisingActive();
    } catch (error) {
      console.error('Failed to get advertising status:', error);
      return false;
    }
  });

  // Get peripheral name
  ipcMain.handle('peripheral:getPeripheralName', async () => {
    try {
      if (!peripheralManager) {
        return 'BLE MIDI Simulator';
      }
      return peripheralManager.getPeripheralName();
    } catch (error) {
      console.error('Failed to get peripheral name:', error);
      return 'BLE MIDI Simulator';
    }
  });

  // Cleanup
  ipcMain.handle('peripheral:cleanup', async () => {
    try {
      if (peripheralManager) {
        await peripheralManager.cleanup();
        peripheralManager = null;
      }
      return true;
    } catch (error) {
      console.error('Failed to cleanup peripheral manager:', error);
      throw error;
    }
  });
}

function setupPeripheralEvents() {
  if (!peripheralManager) return;

  const sendToRenderer = (channel: string, ...args: any[]) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  peripheralManager.on('stateChange', (state: string) => {
    sendToRenderer('bluetooth:stateChange', state);
  });

  peripheralManager.on('advertisingStarted', () => {
    sendToRenderer('peripheral:advertisingStarted');
  });

  peripheralManager.on('advertisingStopped', () => {
    sendToRenderer('peripheral:advertisingStopped');
  });

  peripheralManager.on('advertisingError', (error: string) => {
    sendToRenderer('bluetooth:error', error);
  });

  peripheralManager.on('servicesSet', () => {
    sendToRenderer('peripheral:servicesSet');
  });

  peripheralManager.on('servicesError', (error: string) => {
    sendToRenderer('bluetooth:error', error);
  });

  peripheralManager.on('centralConnected', (centralInfo: CentralInfo) => {
    sendToRenderer('peripheral:centralConnected', centralInfo);
  });

  peripheralManager.on('centralDisconnected', (centralId: string) => {
    sendToRenderer('peripheral:centralDisconnected', centralId);
  });

  peripheralManager.on('midiMessageReceived', (data: Uint8Array) => {
    sendToRenderer('midi:messageReceived', data);
  });
}

export function getPeripheralManager(): PeripheralManager | null {
  return peripheralManager;
}