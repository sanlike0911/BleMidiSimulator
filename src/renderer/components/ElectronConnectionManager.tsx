import React, { useState, useEffect } from 'react';
import { BluetoothDevice } from '../../shared/types';
import BluetoothIcon from '../../../components/icons/BluetoothIcon';
import PlugZapIcon from '../../../components/icons/PlugZapIcon';
import XIcon from '../../../components/icons/XIcon';

interface ElectronConnectionManagerProps {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectedDevice: BluetoothDevice | null;
  scannedDevices: BluetoothDevice[];
  isScanning: boolean;
  error: string | null;
  onStartScan: (nameFilter?: string) => Promise<void>;
  onStopScan: () => Promise<void>;
  onConnect: (deviceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const ElectronConnectionManager: React.FC<ElectronConnectionManagerProps> = ({
  connectionState,
  connectedDevice,
  scannedDevices,
  isScanning,
  error,
  onStartScan,
  onStopScan,
  onConnect,
  onDisconnect
}) => {
  const [deviceNameFilter, setDeviceNameFilter] = useState('');
  const [showDeviceList, setShowDeviceList] = useState(false);

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return `Connected to: ${connectedDevice?.name || 'Unknown Device'}`;
      case 'error':
        return `Error: ${error || 'An unknown error occurred'}`;
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'connecting':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleStartScan = async () => {
    try {
      await onStartScan(deviceNameFilter);
      setShowDeviceList(true);
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  const handleStopScan = async () => {
    try {
      await onStopScan();
      setShowDeviceList(false);
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  };

  const handleDeviceSelect = async (device: BluetoothDevice) => {
    try {
      await handleStopScan();
      await onConnect(device.id);
      setShowDeviceList(false);
    } catch (error) {
      console.error('Failed to connect to device:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Auto-hide device list when not scanning
  useEffect(() => {
    if (!isScanning && scannedDevices.length === 0) {
      setShowDeviceList(false);
    }
  }, [isScanning, scannedDevices.length]);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex items-center space-x-3 self-start sm:self-center">
          <div className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <span className={`font-mono text-sm ${getStatusColor()}`}>{getStatusText()}</span>
        </div>

        {connectionState === 'connected' ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-colors mt-4 sm:mt-0 w-full sm:w-auto justify-center"
          >
            <PlugZapIcon className="w-4 h-4" />
            <span>Disconnect</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <input
              type="text"
              value={deviceNameFilter}
              onChange={(e) => setDeviceNameFilter(e.target.value)}
              placeholder="Device Name (Optional Filter)"
              className="flex-grow sm:flex-grow-0 w-full sm:w-48 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors disabled:opacity-50"
              disabled={connectionState === 'connecting' || isScanning}
              aria-label="Filter BLE devices by name"
            />

            {isScanning ? (
              <button
                onClick={handleStopScan}
                className="flex items-center shrink-0 space-x-2 px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500 transition-colors"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Stop Scan</span>
              </button>
            ) : (
              <button
                onClick={handleStartScan}
                disabled={connectionState === 'connecting'}
                className="flex items-center shrink-0 space-x-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <BluetoothIcon className="w-4 h-4" />
                <span>Scan</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Device List */}
      {showDeviceList && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Found Devices</h3>
            <button
              onClick={() => setShowDeviceList(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {scannedDevices.length === 0 ? (
            <div className="text-center py-8">
              {isScanning ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400 text-sm">Scanning for BLE MIDI devices...</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No devices found. Try scanning again.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scannedDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleDeviceSelect(device)}
                  disabled={connectionState === 'connecting'}
                  className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{device.name}</p>
                      <p className="text-gray-400 text-sm">ID: {device.id}</p>
                    </div>
                    {device.rssi && (
                      <div className="text-gray-400 text-sm">
                        RSSI: {device.rssi}dBm
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ElectronConnectionManager;