import React, { useState, useCallback } from 'react';
import ElectronConnectionManager from './components/ElectronConnectionManager';
import StandardCCSender from '../../components/StandardCCSender';
import HighResCCSender from '../../components/HighResCCSender';
import MidiLog from './components/MidiLog';
import ModeSelector from './components/ModeSelector';
import PeripheralStatus from './components/PeripheralStatus';
import MidiTester from './components/MidiTester';
import ConnectionStats from './components/ConnectionStats';
import DevicePresets from './components/DevicePresets';
import AdvancedMidiSender from './components/AdvancedMidiSender';
import { useElectronAPI } from './hooks/useElectronAPI';
import { useConnectionPersistence } from './hooks/useConnectionPersistence';

type SenderComponent = {
  id: number;
  type: 'standard' | 'high-res';
};

function App() {
  const {
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
  } = useElectronAPI();

  // Connection persistence
  const connectionPersistence = useConnectionPersistence({
    currentMode,
    connectionState,
    connectedDevice,
    isAdvertising,
    central,
    peripheral,
    config: {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      persistDeviceList: true
    }
  });

  const [senders, setSenders] = useState<SenderComponent[]>([
    { id: Date.now(), type: 'standard' },
    { id: Date.now() + 1, type: 'high-res' },
  ]);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

  const addSender = (type: 'standard' | 'high-res') => {
    const newSender: SenderComponent = { id: Date.now() + Math.random(), type };
    setSenders(prev => [...prev, newSender]);
  };

  const removeSender = (id: number) => {
    setSenders(prev => prev.filter(sender => sender.id !== id));
  };

  const handleSendMidi = useCallback(async (message: Uint8Array) => {
    if (!isElectron) {
      console.warn('Electron API not available');
      return;
    }

    const canSend = currentMode === 'central'
      ? connectionState === 'connected'
      : isAdvertising && connectedCentrals.length > 0;

    if (!canSend) {
      console.warn('Cannot send MIDI message - not properly connected.');
      return;
    }

    try {
      await sendMidiMessage(message);
    } catch (error) {
      console.error('Failed to send MIDI message:', error);
    }
  }, [sendMidiMessage, connectionState, isAdvertising, connectedCentrals, currentMode, isElectron]);

  const handleStartScan = useCallback(async (nameFilter?: string) => {
    if (!central) return;
    await central.startScan(nameFilter);
  }, [central]);

  const handleStopScan = useCallback(async () => {
    if (!central) return;
    await central.stopScan();
  }, [central]);

  const handleConnect = useCallback(async (deviceId: string) => {
    if (!central) return;
    await central.connect(deviceId);
  }, [central]);

  const handleDisconnect = useCallback(async () => {
    if (!central) return;
    await central.disconnect();
  }, [central]);

  const handleStartAdvertising = useCallback(async (deviceName: string) => {
    if (!peripheral) return;
    await peripheral.startAdvertising(deviceName);
  }, [peripheral]);

  const handleStopAdvertising = useCallback(async () => {
    if (!peripheral) return;
    await peripheral.stopAdvertising();
  }, [peripheral]);

  const handleDisconnectCentral = useCallback(async (centralId: string) => {
    if (!peripheral) return;
    await peripheral.disconnectCentral(centralId);
  }, [peripheral]);

  const handleApplyPreset = useCallback(async (preset: any) => {
    try {
      if (preset.mode === 'peripheral' && preset.deviceName) {
        await handleStartAdvertising(preset.deviceName);
      }

      console.log(`Applied preset: ${preset.name}`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  }, [handleStartAdvertising]);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('senderId', String(id));
    setDraggedItemId(id);
  };

  const handleDrop = (e: React.DragEvent, dropTargetId: number) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('senderId'));

    if (draggedId === dropTargetId) {
      return;
    }

    setSenders(prevSenders => {
      const draggedIndex = prevSenders.findIndex(s => s.id === draggedId);
      const dropIndex = prevSenders.findIndex(s => s.id === dropTargetId);

      if (draggedIndex === -1 || dropIndex === -1) {
        return prevSenders;
      }

      const newSenders = [...prevSenders];
      const [draggedItem] = newSenders.splice(draggedIndex, 1);
      newSenders.splice(dropIndex, 0, draggedItem);
      return newSenders;
    });
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  // Show fallback message if not running in Electron
  if (!isElectron) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              BLE MIDI Simulator
            </h1>
            <p className="mt-4 text-lg text-red-400">
              This application requires Electron to run. Please use the Electron version.
            </p>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            BLE MIDI Simulator
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            {currentMode === 'central'
              ? 'Connect to a BLE MIDI device to send and receive control change messages.'
              : 'Act as a BLE MIDI device for other applications to connect to.'
            }
          </p>
          <div className="mt-2 text-sm text-blue-400">
            Running in Electron - Full Bluetooth Support
          </div>
        </header>

        <main className="space-y-6">
          {/* Mode Selector */}
          <ModeSelector
            currentMode={currentMode}
            onModeChange={switchMode}
            disabled={false}
          />

          {/* Mode-specific content */}
          {currentMode === 'central' ? (
            <>
              <ElectronConnectionManager
                connectionState={connectionState}
                connectedDevice={connectedDevice}
                scannedDevices={scannedDevices}
                isScanning={isScanning}
                error={error}
                onStartScan={handleStartScan}
                onStopScan={handleStopScan}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </>
          ) : (
            <>
              <PeripheralStatus
                isAdvertising={isAdvertising}
                peripheralName={peripheralName}
                connectedCentrals={connectedCentrals}
                onStartAdvertising={handleStartAdvertising}
                onStopAdvertising={handleStopAdvertising}
                onDisconnectCentral={handleDisconnectCentral}
                error={error}
              />
            </>
          )}

          {/* Connection Statistics */}
          <ConnectionStats
            currentMode={currentMode}
            receivedMessages={receivedMessages}
            connectionState={connectionState}
            connectedDevice={connectedDevice}
            connectedCentrals={connectedCentrals}
            isAdvertising={isAdvertising}
          />

          {/* Device Presets */}
          <DevicePresets
            currentMode={currentMode}
            onApplyPreset={handleApplyPreset}
            onSwitchMode={switchMode}
          />

          {/* Advanced MIDI Sender */}
          <AdvancedMidiSender
            onSend={handleSendMidi}
            disabled={currentMode === 'central'
              ? connectionState !== 'connected'
              : !isAdvertising || connectedCentrals.length === 0
            }
          />

          {/* MIDI Tester */}
          <MidiTester
            currentMode={currentMode}
            onSendMidi={handleSendMidi}
            disabled={currentMode === 'central'
              ? connectionState !== 'connected'
              : !isAdvertising || connectedCentrals.length === 0
            }
          />

          {/* MIDI Senders - available in both modes */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => addSender('standard')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
            >
              Add Standard CC
            </button>
            <button
              onClick={() => addSender('high-res')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
            >
              Add High-Res CC
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {senders.map(sender => {
              const isDisabled = currentMode === 'central'
                ? connectionState !== 'connected'
                : !isAdvertising || connectedCentrals.length === 0;

              if (sender.type === 'standard') {
                return <StandardCCSender
                  key={sender.id}
                  id={sender.id}
                  onSend={handleSendMidi}
                  disabled={isDisabled}
                  onRemove={removeSender}
                  isDragging={draggedItemId === sender.id}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              }
              if (sender.type === 'high-res') {
                return <HighResCCSender
                  key={sender.id}
                  id={sender.id}
                  onSend={handleSendMidi}
                  disabled={isDisabled}
                  onRemove={removeSender}
                  isDragging={draggedItemId === sender.id}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              }
              return null;
            })}
          </div>

          <MidiLog messages={receivedMessages} />
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Electron App with Native Bluetooth Support - {currentMode === 'central' ? 'Central' : 'Peripheral'} Mode</p>
        </footer>
      </div>
    </div>
  );
}

export default App;