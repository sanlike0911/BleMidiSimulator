import React, { useState, useCallback, useRef, useEffect } from 'react';
import ConnectionManager from './components/ConnectionManager';
import StandardCCSender from './components/StandardCCSender';
import HighResCCSender from './components/HighResCCSender';
import MidiLog from './components/MidiLog';
import type { MidiDeviceState, ParsedMidiMessage } from './types';

// BLE MIDI Service and Characteristic UUIDs
const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

function App() {
  const [deviceState, setDeviceState] = useState<MidiDeviceState>({
    device: null,
    status: 'disconnected',
  });
  const [receivedMessages, setReceivedMessages] = useState<ParsedMidiMessage[]>([]);
  // Fix: Replaced 'BluetoothGATTCharacteristic' with 'any' because Web Bluetooth API types are not available in this context.
  const midiCharacteristicRef = useRef<any | null>(null);

  const parseMidiMessage = (data: DataView): ParsedMidiMessage | null => {
    if (data.byteLength < 3) return null;

    const status = data.getUint8(2);
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const data1 = data.getUint8(3);
    const data2 = data.byteLength > 4 ? data.getUint8(4) : 0;

    let type: ParsedMidiMessage['type'] = 'Unknown';
    let description = `Unknown: [${status}, ${data1}, ${data2}]`;

    if (command === 0x90) { // Note On
        type = 'Note On';
        description = `Note On  - Ch: ${channel}, Note: ${data1}, Vel: ${data2}`;
    } else if (command === 0x80) { // Note Off
        type = 'Note Off';
        description = `Note Off - Ch: ${channel}, Note: ${data1}, Vel: ${data2}`;
    } else if (command === 0xb0) { // Control Change
        type = 'Control Change';
        description = `CC       - Ch: ${channel}, CC#: ${data1}, Val: ${data2}`;
    }
    
    return {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        channel,
        data1,
        data2,
        description,
    };
  };

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    // Fix: Replaced 'BluetoothGATTCharacteristic' with 'any' because Web Bluetooth API types are not available in this context.
    const target = event.target as any;
    if (target.value) {
      const parsedMessage = parseMidiMessage(target.value);
      if (parsedMessage) {
          setReceivedMessages(prev => [...prev.slice(-100), parsedMessage]); // Keep log size manageable
      }
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setDeviceState({ device: null, status: 'connecting' });
    try {
      // Fix: Cast 'navigator' to 'any' to access the 'bluetooth' property, which is part of the experimental Web Bluetooth API.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [MIDI_SERVICE_UUID] }],
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server.');

      const service = await server.getPrimaryService(MIDI_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(MIDI_CHARACTERISTIC_UUID);
      
      midiCharacteristicRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      
      setDeviceState({ device, status: 'connected' });

      device.addEventListener('gattserverdisconnected', () => {
        setDeviceState({ device: null, status: 'disconnected' });
        midiCharacteristicRef.current = null;
      });

    } catch (error) {
      // Check if the user cancelled the device picker. This is not a real error.
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        console.log('User cancelled the device selection dialog.');
        setDeviceState({ device: null, status: 'disconnected' });
      } else {
        // Handle other genuine errors
        console.error('BLE Connection Error:', error);
        setDeviceState({
          device: null,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }, [handleCharacteristicValueChanged]);

  const handleDisconnect = useCallback(() => {
    if (deviceState.device && deviceState.device.gatt?.connected) {
      deviceState.device.gatt.disconnect();
    }
    midiCharacteristicRef.current?.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    midiCharacteristicRef.current = null;
    setDeviceState({ device: null, status: 'disconnected' });
  }, [deviceState.device, handleCharacteristicValueChanged]);

  const handleSendMidi = useCallback(async (message: Uint8Array) => {
    if (deviceState.status !== 'connected' || !midiCharacteristicRef.current) {
      console.warn('Cannot send MIDI message, not connected.');
      return;
    }
    try {
      // BLE MIDI packet requires a header and timestamp
      const timestamp = performance.now();
      const header = 0x80; // Header for MIDI data
      const timestampMsb = 0x80 | ( (Math.floor(timestamp) >> 7) & 0x7F );
      const timestampLsb = 0x80 | ( Math.floor(timestamp) & 0x7F );

      // The full packet is [header, timestamp, ...midi_message]
      const packet = new Uint8Array([timestampMsb, timestampLsb, ...message]);
      await midiCharacteristicRef.current.writeValueWithoutResponse(packet);
    } catch (error) {
      console.error('Failed to send MIDI message:', error);
      setDeviceState(prev => ({ ...prev, status: 'error', error: 'Send failed' }));
    }
  }, [deviceState.status]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (deviceState.device && deviceState.device.gatt?.connected) {
        deviceState.device.gatt.disconnect();
      }
    };
  }, [deviceState.device]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            BLE MIDI Simulator
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Connect to a BLE MIDI device to send and receive control change messages.
          </p>
        </header>

        <main className="space-y-6">
          <ConnectionManager
            deviceState={deviceState}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <StandardCCSender onSend={handleSendMidi} disabled={deviceState.status !== 'connected'} />
              <HighResCCSender onSend={handleSendMidi} disabled={deviceState.status !== 'connected'} />
            </div>
            
            <MidiLog messages={receivedMessages} />
          </div>
        </main>
        
        <footer className="text-center mt-12 text-gray-500 text-sm">
            <p>Built for modern browsers with Web Bluetooth support (e.g., Chrome, Edge).</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
