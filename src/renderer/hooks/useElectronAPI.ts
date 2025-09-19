import { useEffect, useState, useCallback } from 'react';
import type { BluetoothMode, ParsedMidiMessage, CentralInfo, BluetoothDevice, ConnectionState } from '../../shared/types';

export function useElectronAPI() {
  const [currentMode, setCurrentMode] = useState<BluetoothMode>('central');
  const [receivedMessages, setReceivedMessages] = useState<ParsedMidiMessage[]>([]);

  // Central mode state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Peripheral mode state
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [peripheralName, setPeripheralName] = useState('BLE MIDI Simulator');
  const [connectedCentrals, setConnectedCentrals] = useState<CentralInfo[]>([]);

  // Common state
  const [error, setError] = useState<string | null>(null);

  // Electronの利用可能性チェック
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // 現在のモードを取得
    window.electronAPI.mode.getCurrent().then(setCurrentMode);

    // 共通イベントリスナー
    const handleMidiMessage = (data: Uint8Array) => {
      const parsed = parseMidiMessage(data);
      if (parsed) {
        setReceivedMessages(prev => [...prev.slice(-99), parsed]);
      }
    };

    const handleModeChanged = (mode: BluetoothMode) => {
      setCurrentMode(mode);
      // Reset state when mode changes
      setError(null);
      if (mode === 'central') {
        setIsAdvertising(false);
        setConnectedCentrals([]);
      } else {
        setConnectionState('disconnected');
        setConnectedDevice(null);
        setScannedDevices([]);
        setIsScanning(false);
      }
    };

    const handleBluetoothError = (errorMessage: string) => {
      setError(errorMessage);
      if (currentMode === 'central') {
        setConnectionState('error');
      }
    };

    // Central mode event handlers
    const handleDeviceFound = (device: BluetoothDevice) => {
      setScannedDevices(prev => {
        const existing = prev.find(d => d.id === device.id);
        if (existing) return prev;
        return [...prev, device];
      });
    };

    const handleConnected = (device: BluetoothDevice) => {
      setConnectedDevice(device);
      setConnectionState('connected');
      setError(null);
    };

    const handleDisconnected = () => {
      setConnectedDevice(null);
      setConnectionState('disconnected');
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };

    const handleScanStarted = () => {
      setIsScanning(true);
      setScannedDevices([]);
    };

    const handleScanStopped = () => {
      setIsScanning(false);
    };

    // Peripheral mode event handlers
    const handleAdvertisingStarted = () => {
      setIsAdvertising(true);
      setError(null);
    };

    const handleAdvertisingStopped = () => {
      setIsAdvertising(false);
    };

    const handleCentralConnected = (centralInfo: CentralInfo) => {
      setConnectedCentrals(prev => {
        const existing = prev.find(c => c.id === centralInfo.id);
        if (existing) return prev;
        return [...prev, centralInfo];
      });
    };

    const handleCentralDisconnected = (centralId: string) => {
      setConnectedCentrals(prev => prev.filter(c => c.id !== centralId));
    };

    // Register event listeners
    window.electronAPI.on('midi:messageReceived', handleMidiMessage);
    window.electronAPI.on('mode:changed', handleModeChanged);
    window.electronAPI.on('bluetooth:error', handleBluetoothError);

    // Central mode events
    window.electronAPI.on('bluetooth:deviceFound', handleDeviceFound);
    window.electronAPI.on('bluetooth:connected', handleConnected);
    window.electronAPI.on('bluetooth:disconnected', handleDisconnected);
    window.electronAPI.on('bluetooth:connectionStateChange', handleConnectionStateChange);
    window.electronAPI.on('bluetooth:scanStarted', handleScanStarted);
    window.electronAPI.on('bluetooth:scanStopped', handleScanStopped);

    // Peripheral mode events
    window.electronAPI.on('peripheral:advertisingStarted', handleAdvertisingStarted);
    window.electronAPI.on('peripheral:advertisingStopped', handleAdvertisingStopped);
    window.electronAPI.on('peripheral:centralConnected', handleCentralConnected);
    window.electronAPI.on('peripheral:centralDisconnected', handleCentralDisconnected);

    return () => {
      // Cleanup all listeners
      window.electronAPI.removeAllListeners('midi:messageReceived');
      window.electronAPI.removeAllListeners('mode:changed');
      window.electronAPI.removeAllListeners('bluetooth:error');
      window.electronAPI.removeAllListeners('bluetooth:deviceFound');
      window.electronAPI.removeAllListeners('bluetooth:connected');
      window.electronAPI.removeAllListeners('bluetooth:disconnected');
      window.electronAPI.removeAllListeners('bluetooth:connectionStateChange');
      window.electronAPI.removeAllListeners('bluetooth:scanStarted');
      window.electronAPI.removeAllListeners('bluetooth:scanStopped');
      window.electronAPI.removeAllListeners('peripheral:advertisingStarted');
      window.electronAPI.removeAllListeners('peripheral:advertisingStopped');
      window.electronAPI.removeAllListeners('peripheral:centralConnected');
      window.electronAPI.removeAllListeners('peripheral:centralDisconnected');
    };
  }, [isElectron, currentMode]);

  // Initialize mode controller on mount
  useEffect(() => {
    if (!isElectron) return;

    const initializeAPI = async () => {
      try {
        await window.electronAPI.mode.initialize();

        // Get current peripheral name if in peripheral mode
        if (currentMode === 'peripheral') {
          const name = await window.electronAPI.peripheral.getPeripheralName();
          setPeripheralName(name);
          const advertising = await window.electronAPI.peripheral.getAdvertisingStatus();
          setIsAdvertising(advertising);
          const centrals = await window.electronAPI.peripheral.getConnectedCentrals();
          setConnectedCentrals(centrals);
        }
      } catch (error) {
        console.error('Failed to initialize Electron API:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      }
    };

    initializeAPI();
  }, [isElectron, currentMode]);

  // Mode switching
  const switchMode = useCallback(async (mode: BluetoothMode) => {
    if (!isElectron) throw new Error('Not running in Electron');

    try {
      await window.electronAPI.mode.switchTo(mode);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch mode';
      setError(errorMessage);
      throw error;
    }
  }, [isElectron]);

  // MIDI message sending (works for both modes)
  const sendMidiMessage = useCallback(async (message: Uint8Array) => {
    if (!isElectron) throw new Error('Not running in Electron');

    try {
      await window.electronAPI.midi.sendMessage(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send MIDI message';
      setError(errorMessage);
      throw error;
    }
  }, [isElectron]);

  // Central mode methods
  const central = isElectron ? {
    startScan: async (nameFilter?: string) => {
      try {
        await window.electronAPI.central.startScan(nameFilter);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start scan';
        setError(errorMessage);
        throw error;
      }
    },
    stopScan: async () => {
      try {
        await window.electronAPI.central.stopScan();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stop scan';
        setError(errorMessage);
        throw error;
      }
    },
    connect: async (deviceId: string) => {
      try {
        await window.electronAPI.central.connect(deviceId);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
        setError(errorMessage);
        throw error;
      }
    },
    disconnect: async () => {
      try {
        await window.electronAPI.central.disconnect();
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect';
        setError(errorMessage);
        throw error;
      }
    },
  } : null;

  // Peripheral mode methods
  const peripheral = isElectron ? {
    startAdvertising: async (deviceName: string) => {
      try {
        await window.electronAPI.peripheral.startAdvertising(deviceName);
        setPeripheralName(deviceName);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start advertising';
        setError(errorMessage);
        throw error;
      }
    },
    stopAdvertising: async () => {
      try {
        await window.electronAPI.peripheral.stopAdvertising();
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stop advertising';
        setError(errorMessage);
        throw error;
      }
    },
    disconnectCentral: async (centralId: string) => {
      try {
        await window.electronAPI.peripheral.disconnectCentral(centralId);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect central';
        setError(errorMessage);
        throw error;
      }
    },
  } : null;

  return {
    isElectron,
    currentMode,
    receivedMessages,

    // Central mode state
    connectionState,
    connectedDevice,
    scannedDevices,
    isScanning,

    // Peripheral mode state
    isAdvertising,
    peripheralName,
    connectedCentrals,

    // Common state
    error,

    // Methods
    switchMode,
    sendMidiMessage,
    central,
    peripheral,
  };
}

// Helper function to parse MIDI messages
function parseMidiMessage(data: Uint8Array): ParsedMidiMessage | null {
  if (data.length < 3) return null;

  // Skip BLE MIDI timestamp bytes (first 1-2 bytes with high bit set)
  let midiStart = 0;
  while (midiStart < data.length && (data[midiStart] & 0x80) === 0x80 && (data[midiStart] & 0x7F) !== 0) {
    midiStart++;
  }

  if (midiStart >= data.length) return null;

  const status = data[midiStart];
  const channel = (status & 0x0F) + 1;
  const messageType = status & 0xF0;

  let type: ParsedMidiMessage['type'] = 'Unknown';
  let description = '';

  if (midiStart + 2 < data.length) {
    const data1 = data[midiStart + 1];
    const data2 = data[midiStart + 2];

    switch (messageType) {
      case 0x90:
        if (data2 > 0) {
          type = 'Note On';
          description = `Note ${data1} On, Velocity ${data2}`;
        } else {
          type = 'Note Off';
          description = `Note ${data1} Off`;
        }
        break;
      case 0x80:
        type = 'Note Off';
        description = `Note ${data1} Off, Velocity ${data2}`;
        break;
      case 0xB0:
        type = 'Control Change';
        description = `CC ${data1}, Value ${data2}`;
        break;
      default:
        description = `Status: ${status.toString(16)}, Data: ${data1}, ${data2}`;
        break;
    }

    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      channel,
      data1,
      data2,
      description
    };
  }

  return null;
}