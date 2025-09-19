import { useEffect, useCallback, useRef } from 'react';
import { BluetoothMode, ConnectionState, BluetoothDevice } from '../../shared/types';

interface ConnectionPersistenceConfig {
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  persistDeviceList: boolean;
}

interface UseConnectionPersistenceProps {
  currentMode: BluetoothMode;
  connectionState: ConnectionState;
  connectedDevice: BluetoothDevice | null;
  isAdvertising: boolean;
  central: any;
  peripheral: any;
  config: ConnectionPersistenceConfig;
}

export function useConnectionPersistence({
  currentMode,
  connectionState,
  connectedDevice,
  isAdvertising,
  central,
  peripheral,
  config
}: UseConnectionPersistenceProps) {
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastConnectedDevice = useRef<BluetoothDevice | null>(null);
  const lastPeripheralName = useRef<string>('BLE MIDI Simulator');

  // Save connection state to localStorage
  const saveConnectionState = useCallback(() => {
    if (!config.persistDeviceList) return;

    const state = {
      lastMode: currentMode,
      lastConnectedDevice: connectedDevice,
      lastPeripheralName: lastPeripheralName.current,
      timestamp: Date.now()
    };

    localStorage.setItem('bleMidiConnectionState', JSON.stringify(state));
  }, [currentMode, connectedDevice, config.persistDeviceList]);

  // Load connection state from localStorage
  const loadConnectionState = useCallback(() => {
    if (!config.persistDeviceList) return null;

    try {
      const saved = localStorage.getItem('bleMidiConnectionState');
      if (!saved) return null;

      const state = JSON.parse(saved);

      // Only use saved state if it's less than 24 hours old
      if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('bleMidiConnectionState');
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load connection state:', error);
      return null;
    }
  }, [config.persistDeviceList]);

  // Auto-reconnect logic for Central mode
  const attemptReconnection = useCallback(async () => {
    if (!config.autoReconnect || currentMode !== 'central' || !lastConnectedDevice.current) {
      return;
    }

    if (reconnectAttempts.current >= config.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    reconnectAttempts.current++;
    console.log(`Attempting reconnection ${reconnectAttempts.current}/${config.maxReconnectAttempts}`);

    try {
      if (central) {
        await central.connect(lastConnectedDevice.current.id);
        console.log('Reconnection successful');
        reconnectAttempts.current = 0;
      }
    } catch (error) {
      console.error('Reconnection failed:', error);

      // Schedule next attempt
      if (reconnectAttempts.current < config.maxReconnectAttempts) {
        reconnectTimer.current = setTimeout(attemptReconnection, config.reconnectInterval);
      }
    }
  }, [config, currentMode, central]);

  // Auto-restart advertising for Peripheral mode
  const attemptAdvertisingRestart = useCallback(async () => {
    if (!config.autoReconnect || currentMode !== 'peripheral') {
      return;
    }

    if (reconnectAttempts.current >= config.maxReconnectAttempts) {
      console.log('Max advertising restart attempts reached');
      return;
    }

    reconnectAttempts.current++;
    console.log(`Attempting to restart advertising ${reconnectAttempts.current}/${config.maxReconnectAttempts}`);

    try {
      if (peripheral) {
        await peripheral.startAdvertising(lastPeripheralName.current);
        console.log('Advertising restart successful');
        reconnectAttempts.current = 0;
      }
    } catch (error) {
      console.error('Advertising restart failed:', error);

      // Schedule next attempt
      if (reconnectAttempts.current < config.maxReconnectAttempts) {
        reconnectTimer.current = setTimeout(attemptAdvertisingRestart, config.reconnectInterval);
      }
    }
  }, [config, currentMode, peripheral]);

  // Monitor connection state changes
  useEffect(() => {
    if (currentMode === 'central') {
      if (connectionState === 'connected' && connectedDevice) {
        // Save successfully connected device
        lastConnectedDevice.current = connectedDevice;
        reconnectAttempts.current = 0;
        saveConnectionState();

        // Clear any pending reconnection attempts
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      } else if (connectionState === 'disconnected' && lastConnectedDevice.current) {
        // Connection lost, attempt reconnection
        if (config.autoReconnect) {
          console.log('Connection lost, scheduling reconnection attempt');
          reconnectTimer.current = setTimeout(attemptReconnection, config.reconnectInterval);
        }
      }
    }
  }, [connectionState, connectedDevice, currentMode, config.autoReconnect, attemptReconnection, saveConnectionState]);

  // Monitor advertising state changes for Peripheral mode
  useEffect(() => {
    if (currentMode === 'peripheral') {
      if (isAdvertising) {
        reconnectAttempts.current = 0;
        saveConnectionState();

        // Clear any pending restart attempts
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      } else {
        // Advertising stopped unexpectedly, attempt restart
        if (config.autoReconnect) {
          console.log('Advertising stopped, scheduling restart attempt');
          reconnectTimer.current = setTimeout(attemptAdvertisingRestart, config.reconnectInterval);
        }
      }
    }
  }, [isAdvertising, currentMode, config.autoReconnect, attemptAdvertisingRestart, saveConnectionState]);

  // Auto-restore connection on app start
  useEffect(() => {
    const savedState = loadConnectionState();
    if (!savedState) return;

    console.log('Attempting to restore previous connection state');

    // Small delay to ensure components are ready
    const timer = setTimeout(async () => {
      try {
        if (savedState.lastMode === 'central' && savedState.lastConnectedDevice && central) {
          lastConnectedDevice.current = savedState.lastConnectedDevice;
          console.log('Attempting to reconnect to last device:', savedState.lastConnectedDevice.name);
          // Note: Actual reconnection will be handled by the reconnection logic
        } else if (savedState.lastMode === 'peripheral' && savedState.lastPeripheralName && peripheral) {
          lastPeripheralName.current = savedState.lastPeripheralName;
          console.log('Attempting to restart advertising with name:', savedState.lastPeripheralName);
          // Note: Actual restart will be handled by the advertising restart logic
        }
      } catch (error) {
        console.error('Failed to restore connection state:', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loadConnectionState, central, peripheral]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, []);

  return {
    reconnectAttempts: reconnectAttempts.current,
    isReconnecting: reconnectTimer.current !== null,
    lastConnectedDevice: lastConnectedDevice.current,
    clearReconnectionState: () => {
      reconnectAttempts.current = 0;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    }
  };
}