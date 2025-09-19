import React, { useState, useCallback } from 'react';
import { BluetoothMode } from '../../shared/types';

interface MidiTesterProps {
  currentMode: BluetoothMode;
  onSendMidi: (message: Uint8Array) => Promise<void>;
  disabled: boolean;
}

const MidiTester: React.FC<MidiTesterProps> = ({
  currentMode,
  onSendMidi,
  disabled
}) => {
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [testInterval, setTestInterval] = useState(1000);
  const [testNote, setTestNote] = useState(60); // Middle C
  const [testVelocity, setTestVelocity] = useState(100);
  const [testCC, setTestCC] = useState(7); // Volume
  const [testCCValue, setTestCCValue] = useState(100);

  const sendTestNoteOn = useCallback(async () => {
    if (disabled) return;

    const message = new Uint8Array([0x90, testNote, testVelocity]); // Note On, Channel 1
    await onSendMidi(message);
    console.log(`Sent Note On: Note ${testNote}, Velocity ${testVelocity}`);
  }, [onSendMidi, testNote, testVelocity, disabled]);

  const sendTestNoteOff = useCallback(async () => {
    if (disabled) return;

    const message = new Uint8Array([0x80, testNote, 0]); // Note Off, Channel 1
    await onSendMidi(message);
    console.log(`Sent Note Off: Note ${testNote}`);
  }, [onSendMidi, testNote, disabled]);

  const sendTestCC = useCallback(async () => {
    if (disabled) return;

    const message = new Uint8Array([0xB0, testCC, testCCValue]); // Control Change, Channel 1
    await onSendMidi(message);
    console.log(`Sent CC: Controller ${testCC}, Value ${testCCValue}`);
  }, [onSendMidi, testCC, testCCValue, disabled]);

  const startAutoTest = useCallback(() => {
    if (disabled || isAutoTesting) return;

    setIsAutoTesting(true);

    const intervalId = setInterval(async () => {
      try {
        // Send Note On
        await sendTestNoteOn();

        // Wait 100ms then send Note Off
        setTimeout(async () => {
          try {
            await sendTestNoteOff();
          } catch (error) {
            console.error('Auto test Note Off failed:', error);
          }
        }, 100);

        // Send CC change
        setTimeout(async () => {
          try {
            const randomValue = Math.floor(Math.random() * 128);
            const message = new Uint8Array([0xB0, testCC, randomValue]);
            await onSendMidi(message);
            console.log(`Auto test CC: Controller ${testCC}, Value ${randomValue}`);
          } catch (error) {
            console.error('Auto test CC failed:', error);
          }
        }, 200);

      } catch (error) {
        console.error('Auto test failed:', error);
        setIsAutoTesting(false);
        clearInterval(intervalId);
      }
    }, testInterval);

    // Store interval ID for cleanup
    (window as any).midiTestInterval = intervalId;
  }, [disabled, isAutoTesting, testInterval, sendTestNoteOn, sendTestNoteOff, onSendMidi, testCC]);

  const stopAutoTest = useCallback(() => {
    setIsAutoTesting(false);
    if ((window as any).midiTestInterval) {
      clearInterval((window as any).midiTestInterval);
      (window as any).midiTestInterval = null;
    }
  }, []);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">MIDI Communication Tester</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          currentMode === 'central'
            ? 'bg-blue-600 text-blue-100'
            : 'bg-green-600 text-green-100'
        }`}>
          {currentMode.toUpperCase()} MODE
        </div>
      </div>

      {disabled && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            {currentMode === 'central'
              ? 'Connect to a device to start testing'
              : 'Start advertising and wait for connections to test'
            }
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Manual Test Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Test Note</label>
            <input
              type="number"
              min="0"
              max="127"
              value={testNote}
              onChange={(e) => setTestNote(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Velocity</label>
            <input
              type="number"
              min="1"
              max="127"
              value={testVelocity}
              onChange={(e) => setTestVelocity(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">CC Number</label>
            <input
              type="number"
              min="0"
              max="127"
              value={testCC}
              onChange={(e) => setTestCC(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Manual Test Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={sendTestNoteOn}
            disabled={disabled}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Note On
          </button>

          <button
            onClick={sendTestNoteOff}
            disabled={disabled}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Note Off
          </button>

          <button
            onClick={sendTestCC}
            disabled={disabled}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send CC
          </button>
        </div>

        {/* Auto Test Controls */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-white">Auto Test</h4>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Interval (ms):</label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={testInterval}
                onChange={(e) => setTestInterval(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                disabled={disabled || isAutoTesting}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isAutoTesting ? (
              <button
                onClick={startAutoTest}
                disabled={disabled}
                className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Auto Test
              </button>
            ) : (
              <button
                onClick={stopAutoTest}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-colors"
              >
                Stop Auto Test
              </button>
            )}
          </div>

          {isAutoTesting && (
            <div className="mt-2 flex items-center space-x-2 text-purple-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Auto test running every {testInterval}ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MidiTester;