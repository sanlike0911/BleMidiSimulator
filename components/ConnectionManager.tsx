import React from 'react';
import type { MidiDeviceState } from '../types';
import BluetoothIcon from './icons/BluetoothIcon';
import PlugZapIcon from './icons/PlugZapIcon';

interface ConnectionManagerProps {
  deviceState: MidiDeviceState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ deviceState, onConnect, onDisconnect }) => {
  const { status, device, error } = deviceState;

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return `Connected to: ${device?.name || 'Unknown Device'}`;
      case 'error':
        return `Error: ${error || 'An unknown error occurred'}`;
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (status) {
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

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
        <span className={`font-mono text-sm ${getStatusColor()}`}>{getStatusText()}</span>
      </div>
      {status === 'connected' ? (
        <button
          onClick={onDisconnect}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-colors"
        >
          <PlugZapIcon className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      ) : (
        <button
          onClick={onConnect}
          disabled={status === 'connecting'}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <BluetoothIcon className="w-4 h-4" />
          <span>Connect to BLE MIDI</span>
        </button>
      )}
    </div>
  );
};

export default ConnectionManager;
