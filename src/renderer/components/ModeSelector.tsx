import React, { useState, useEffect } from 'react';
import { BluetoothMode } from '../../shared/types';

interface ModeSelectorProps {
  currentMode: BluetoothMode;
  onModeChange: (mode: BluetoothMode) => Promise<void>;
  disabled?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleModeSwitch = async (newMode: BluetoothMode) => {
    if (newMode === currentMode || isSwitching) {
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      await onModeChange(newMode);
    } catch (error) {
      console.error('Failed to switch mode:', error);
      setSwitchError(error instanceof Error ? error.message : 'Failed to switch mode');
    } finally {
      setIsSwitching(false);
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (switchError) {
      const timer = setTimeout(() => {
        setSwitchError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [switchError]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Bluetooth Mode</h3>
          {isSwitching && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Switching...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleModeSwitch('central')}
            disabled={disabled || isSwitching}
            className={`
              flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
              ${currentMode === 'central'
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
              }
              ${disabled || isSwitching
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
              }
            `}
          >
            <div className="w-8 h-8 mb-2 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <span className="font-medium">Central</span>
            <span className="text-xs text-center mt-1 opacity-75">
              Connect to devices
            </span>
          </button>

          <button
            onClick={() => handleModeSwitch('peripheral')}
            disabled={disabled || isSwitching}
            className={`
              flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
              ${currentMode === 'peripheral'
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
              }
              ${disabled || isSwitching
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
              }
            `}
          >
            <div className="w-8 h-8 mb-2 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <span className="font-medium">Peripheral</span>
            <span className="text-xs text-center mt-1 opacity-75">
              Act as MIDI device
            </span>
          </button>
        </div>

        {/* Current Mode Info */}
        <div className="text-sm text-gray-400 text-center">
          Currently in{' '}
          <span className={`font-semibold ${
            currentMode === 'central' ? 'text-blue-400' : 'text-green-400'
          }`}>
            {currentMode}
          </span>{' '}
          mode
        </div>

        {/* Error Display */}
        {switchError && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-400 text-sm">{switchError}</p>
            </div>
          </div>
        )}

        {/* Mode Description */}
        <div className="text-xs text-gray-500 space-y-1">
          {currentMode === 'central' ? (
            <>
              <p><strong>Central Mode:</strong> Scan for and connect to BLE MIDI devices.</p>
              <p>Use this mode to control external MIDI hardware.</p>
            </>
          ) : (
            <>
              <p><strong>Peripheral Mode:</strong> Advertise as a BLE MIDI device.</p>
              <p>Other devices can connect to this application.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;