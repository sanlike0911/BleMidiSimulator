import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useColorScheme,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleMidiManager } from './src/core/ble/ble-midi-manager';
import { PeripheralManager } from './src/core/ble/peripheral/peripheral-manager';
import { BluetoothDevice } from './src/types/ble';
import { ParsedMidiMessage } from './src/types/midi';
import { ConnectedClient } from './src/types/peripheral';

type AppMode = 'central' | 'peripheral' | 'both';

interface AppState {
  mode: AppMode;
  bleState: string;
  centralManager?: BleMidiManager;
  peripheralManager?: PeripheralManager;
  scannedDevices: BluetoothDevice[];
  connectedDevices: BluetoothDevice[];
  connectedClients: ConnectedClient[];
  isScanning: boolean;
  isAdvertising: boolean;
  midiLog: ParsedMidiMessage[];
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [appState, setAppState] = useState<AppState>({
    mode: 'central',
    bleState: 'Unknown',
    scannedDevices: [],
    connectedDevices: [],
    connectedClients: [],
    isScanning: false,
    isAdvertising: false,
    midiLog: [],
  });

  useEffect(() => {
    initializeApp();
    return () => {
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      const centralManager = new BleMidiManager({
        maxConnections: 8,
        enableLogging: true,
        maxLogEntries: 100,
      });

      const peripheralManager = new PeripheralManager({
        deviceName: 'BLE MIDI Simulator',
        maxConnections: 8,
        enableVirtualInstruments: true,
      });

      setupCentralEventListeners(centralManager);
      setupPeripheralEventListeners(peripheralManager);

      await centralManager.initialize();
      await peripheralManager.initialize();

      const bleState = await centralManager.getBluetoothState();

      setAppState(prev => ({
        ...prev,
        centralManager,
        peripheralManager,
        bleState,
      }));

    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Error', 'Failed to initialize BLE MIDI. Please check Bluetooth permissions.');
    }
  };

  const setupCentralEventListeners = (manager: BleMidiManager) => {
    manager.on('deviceFound', (device: BluetoothDevice) => {
      setAppState(prev => {
        const devices = prev.scannedDevices.filter(d => d.id !== device.id);
        return { ...prev, scannedDevices: [...devices, device] };
      });
    });

    manager.on('connected', (device: BluetoothDevice) => {
      setAppState(prev => {
        const devices = prev.connectedDevices.filter(d => d.id !== device.id);
        return { ...prev, connectedDevices: [...devices, device] };
      });
    });

    manager.on('disconnected', (device: BluetoothDevice) => {
      setAppState(prev => ({
        ...prev,
        connectedDevices: prev.connectedDevices.filter(d => d.id !== device.id),
      }));
    });

    manager.on('messageReceived', (device: BluetoothDevice, message: ParsedMidiMessage) => {
      setAppState(prev => ({
        ...prev,
        midiLog: [...prev.midiLog.slice(-99), message],
      }));
    });

    manager.on('scanStarted', () => {
      setAppState(prev => ({ ...prev, isScanning: true }));
    });

    manager.on('scanStopped', () => {
      setAppState(prev => ({ ...prev, isScanning: false }));
    });
  };

  const setupPeripheralEventListeners = (manager: PeripheralManager) => {
    manager.on('clientConnected', (client: ConnectedClient) => {
      setAppState(prev => {
        const clients = prev.connectedClients.filter(c => c.id !== client.id);
        return { ...prev, connectedClients: [...clients, client] };
      });
    });

    manager.on('clientDisconnected', (clientId: string) => {
      setAppState(prev => ({
        ...prev,
        connectedClients: prev.connectedClients.filter(c => c.id !== clientId),
      }));
    });

    manager.on('midiMessageReceived', (clientId: string, message: ParsedMidiMessage) => {
      setAppState(prev => ({
        ...prev,
        midiLog: [...prev.midiLog.slice(-99), message],
      }));
    });

    manager.on('advertisingStarted', () => {
      setAppState(prev => ({ ...prev, isAdvertising: true }));
    });

    manager.on('advertisingStopped', () => {
      setAppState(prev => ({ ...prev, isAdvertising: false }));
    });
  };

  const cleanup = () => {
    appState.centralManager?.destroy();
    appState.peripheralManager?.destroy();
  };

  const switchMode = (mode: AppMode) => {
    setAppState(prev => ({ ...prev, mode }));
  };

  const styles = createStyles(isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BLE MIDI Simulator</Text>
        <Text style={styles.headerSubtitle}>Bluetooth: {appState.bleState}</Text>
      </View>

      {/* Mode Tabs */}
      <View style={styles.tabContainer}>
        {(['central', 'peripheral', 'both'] as AppMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.tab,
              appState.mode === mode && styles.activeTab,
            ]}
            onPress={() => switchMode(mode)}
          >
            <Text style={[
              styles.tabText,
              appState.mode === mode && styles.activeTabText,
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {(appState.mode === 'central' || appState.mode === 'both') && (
          <CentralModeView
            centralManager={appState.centralManager}
            scannedDevices={appState.scannedDevices}
            connectedDevices={appState.connectedDevices}
            isScanning={appState.isScanning}
            styles={styles}
          />
        )}

        {(appState.mode === 'peripheral' || appState.mode === 'both') && (
          <PeripheralModeView
            peripheralManager={appState.peripheralManager}
            connectedClients={appState.connectedClients}
            isAdvertising={appState.isAdvertising}
            styles={styles}
          />
        )}

        {/* MIDI Log */}
        <View style={styles.logContainer}>
          <Text style={styles.sectionTitle}>MIDI Log</Text>
          <View style={styles.logContent}>
            {appState.midiLog.slice(-10).map((message, index) => (
              <Text key={index} style={styles.logEntry}>
                {message.type} CH{message.channel}
                {message.type === 'noteOn' || message.type === 'noteOff' ?
                  ` Note${(message as any).note} Vel${(message as any).velocity}` :
                  message.type === 'controlChange' ?
                  ` CC${(message as any).controller}=${(message as any).value}` :
                  ' Unknown'
                }
              </Text>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface CentralModeViewProps {
  centralManager?: BleMidiManager;
  scannedDevices: BluetoothDevice[];
  connectedDevices: BluetoothDevice[];
  isScanning: boolean;
  styles: any;
}

function CentralModeView({ centralManager, scannedDevices, connectedDevices, isScanning, styles }: CentralModeViewProps) {
  const handleScan = async () => {
    if (!centralManager) return;

    if (isScanning) {
      await centralManager.stopScan();
    } else {
      try {
        await centralManager.startScan();
      } catch (error) {
        Alert.alert('Error', 'Failed to start scan. Please check permissions.');
      }
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    if (!centralManager) return;

    try {
      await centralManager.connectToDevice(device);
    } catch (error) {
      Alert.alert('Error', `Failed to connect to ${device.name}`);
    }
  };

  const sendTestCC = async (deviceId: string) => {
    if (!centralManager) return;

    try {
      await centralManager.sendControlChange(deviceId, 0, 1, Math.floor(Math.random() * 128));
    } catch (error) {
      Alert.alert('Error', 'Failed to send MIDI message');
    }
  };

  return (
    <View style={styles.modeContainer}>
      <Text style={styles.sectionTitle}>Central Mode</Text>

      <TouchableOpacity style={styles.button} onPress={handleScan}>
        <Text style={styles.buttonText}>
          {isScanning ? 'Stop Scan' : 'Start Scan'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.subsectionTitle}>Scanned Devices ({scannedDevices.length})</Text>
      {scannedDevices.map((device) => (
        <TouchableOpacity
          key={device.id}
          style={styles.deviceItem}
          onPress={() => handleConnect(device)}
        >
          <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceId}>{device.id}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.subsectionTitle}>Connected Devices ({connectedDevices.length})</Text>
      {connectedDevices.map((device) => (
        <View key={device.id} style={styles.connectedDevice}>
          <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => sendTestCC(device.id)}
          >
            <Text style={styles.testButtonText}>Send CC</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

interface PeripheralModeViewProps {
  peripheralManager?: PeripheralManager;
  connectedClients: ConnectedClient[];
  isAdvertising: boolean;
  styles: any;
}

function PeripheralModeView({ peripheralManager, connectedClients, isAdvertising, styles }: PeripheralModeViewProps) {
  const handleAdvertising = async () => {
    if (!peripheralManager) return;

    if (isAdvertising) {
      await peripheralManager.stopAdvertising();
    } else {
      try {
        await peripheralManager.startAdvertising();
      } catch (error) {
        Alert.alert('Error', 'Failed to start advertising');
      }
    }
  };

  const sendTestNote = async () => {
    if (!peripheralManager) return;

    try {
      const note = 60 + Math.floor(Math.random() * 12); // C4 to B4
      await peripheralManager.sendNoteOn(0, note, 100);
      setTimeout(() => {
        peripheralManager.sendNoteOff(0, note, 100);
      }, 500);
    } catch (error) {
      Alert.alert('Error', 'Failed to send MIDI note');
    }
  };

  return (
    <View style={styles.modeContainer}>
      <Text style={styles.sectionTitle}>Peripheral Mode</Text>

      <TouchableOpacity style={styles.button} onPress={handleAdvertising}>
        <Text style={styles.buttonText}>
          {isAdvertising ? 'Stop Advertising' : 'Start Advertising'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.subsectionTitle}>Status</Text>
      <Text style={styles.statusText}>Advertising: {isAdvertising ? 'ON' : 'OFF'}</Text>
      <Text style={styles.statusText}>Device Name: BLE MIDI Simulator</Text>

      <Text style={styles.subsectionTitle}>Connected Clients ({connectedClients.length})</Text>
      {connectedClients.map((client) => (
        <View key={client.id} style={styles.clientItem}>
          <Text style={styles.deviceName}>{client.name || 'Unknown Client'}</Text>
          <Text style={styles.deviceId}>{client.id}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.testButton} onPress={sendTestNote}>
        <Text style={styles.testButtonText}>Send Test Note</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(isDarkMode: boolean) {
  const backgroundColor = isDarkMode ? '#111827' : '#f9fafb';
  const surfaceColor = isDarkMode ? '#1f2937' : '#ffffff';
  const textColor = isDarkMode ? '#f9fafb' : '#111827';
  const subtextColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const primaryColor = '#3b82f6';
  const borderColor = isDarkMode ? '#374151' : '#e5e7eb';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor,
    },
    header: {
      padding: 16,
      backgroundColor: surfaceColor,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: textColor,
    },
    headerSubtitle: {
      fontSize: 14,
      color: subtextColor,
      marginTop: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: surfaceColor,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },
    tabText: {
      fontSize: 16,
      color: subtextColor,
    },
    activeTabText: {
      color: primaryColor,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    modeContainer: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: textColor,
      marginBottom: 12,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: textColor,
      marginTop: 12,
      marginBottom: 8,
    },
    button: {
      backgroundColor: primaryColor,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    deviceItem: {
      backgroundColor: surfaceColor,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: borderColor,
    },
    connectedDevice: {
      backgroundColor: surfaceColor,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: borderColor,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    clientItem: {
      backgroundColor: surfaceColor,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: borderColor,
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '500',
      color: textColor,
    },
    deviceId: {
      fontSize: 12,
      color: subtextColor,
      marginTop: 4,
    },
    statusText: {
      fontSize: 14,
      color: textColor,
      marginBottom: 4,
    },
    testButton: {
      backgroundColor: '#10b981',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
    },
    testButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '500',
    },
    logContainer: {
      backgroundColor: surfaceColor,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: borderColor,
      maxHeight: 200,
    },
    logContent: {
      maxHeight: 150,
    },
    logEntry: {
      fontSize: 12,
      color: textColor,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginBottom: 2,
    },
  });
}

export default App;
