import React, { useState, useEffect } from 'react';
import { CentralInfo } from '../../shared/types';

interface PeripheralStatusProps {
  isAdvertising: boolean;
  peripheralName: string;
  connectedCentrals: CentralInfo[];
  onStartAdvertising: (deviceName: string) => Promise<void>;
  onStopAdvertising: () => Promise<void>;
  onDisconnectCentral: (centralId: string) => Promise<void>;
  error: string | null;
}

const PeripheralStatus: React.FC<PeripheralStatusProps> = ({
  isAdvertising,
  peripheralName,
  connectedCentrals,
  onStartAdvertising,
  onStopAdvertising,
  onDisconnectCentral,
  error
}) => {
  const [deviceName, setDeviceName] = useState(peripheralName);
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    setDeviceName(peripheralName);
  }, [peripheralName]);

  const handleStartAdvertising = async () => {
    if (isOperating) return;

    setIsOperating(true);
    try {
      await onStartAdvertising(deviceName.trim() || 'BLE MIDI Simulator');
    } catch (error) {
      console.error('Failed to start advertising:', error);
    } finally {
      setIsOperating(false);
    }
  };

  const handleStopAdvertising = async () => {
    if (isOperating) return;

    setIsOperating(true);
    try {
      await onStopAdvertising();
    } catch (error) {
      console.error('Failed to stop advertising:', error);
    } finally {
      setIsOperating(false);
    }
  };

  const handleDisconnectCentral = async (centralId: string) => {
    try {
      await onDisconnectCentral(centralId);
    } catch (error) {
      console.error('Failed to disconnect central:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(date));
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(startTime).getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Advertising Control */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Peripheral Status</h3>
          <div className={`flex items-center space-x-2 ${
            isAdvertising ? 'text-green-400' : 'text-gray-400'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isAdvertising ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
            }`}></div>
            <span className="text-sm font-medium">
              {isAdvertising ? 'Advertising' : 'Stopped'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {!isAdvertising ? (
            <>
              <div>
                <label htmlFor="device-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Device Name
                </label>
                <input
                  id="device-name"
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="BLE MIDI Simulator"
                  maxLength={20}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={isOperating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be visible to other devices when scanning
                </p>
              </div>

              <button
                onClick={handleStartAdvertising}
                disabled={isOperating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isOperating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Start Advertising</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-green-400 font-medium">Broadcasting as "{peripheralName}"</p>
                    <p className="text-green-300 text-sm">Other devices can now connect to this MIDI device</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStopAdvertising}
                disabled={isOperating}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isOperating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Stopping...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-6 6" />
                    </svg>
                    <span>Stop Advertising</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connected Centrals */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Connected Devices ({connectedCentrals.length})
        </h3>

        {connectedCentrals.length === 0 ? (
          <div className="text-center py-6">
            <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-400 text-sm">
              {isAdvertising ? 'Waiting for devices to connect...' : 'Start advertising to accept connections'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedCentrals.map((central) => (
              <div
                key={central.id}
                className="bg-gray-700 border border-gray-600 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-white font-medium">
                        {central.name || 'Unknown Device'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400 mt-1 space-y-1">
                      <p>ID: {central.id}</p>
                      {central.address && <p>Address: {central.address}</p>}
                      <p>Connected: {formatTimestamp(central.connectionTime)} ({formatDuration(central.connectionTime)} ago)</p>
                      <p>Last Activity: {formatTimestamp(central.lastActivity)}</p>
                      <p>MTU: {central.mtu} bytes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectCentral(central.id)}
                    className="ml-3 p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Disconnect Device"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeripheralStatus;