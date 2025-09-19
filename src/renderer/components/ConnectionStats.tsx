import React, { useState, useEffect } from 'react';
import { BluetoothMode, ParsedMidiMessage, ConnectionState, CentralInfo, BluetoothDevice } from '../../shared/types';

interface ConnectionStatsProps {
  currentMode: BluetoothMode;
  receivedMessages: ParsedMidiMessage[];
  connectionState?: ConnectionState;
  connectedDevice?: BluetoothDevice | null;
  connectedCentrals?: CentralInfo[];
  isAdvertising?: boolean;
}

interface Stats {
  totalMessages: number;
  messagesPerSecond: number;
  noteOnCount: number;
  noteOffCount: number;
  ccCount: number;
  connectionUptime: number;
  lastMessageTime: Date | null;
}

const ConnectionStats: React.FC<ConnectionStatsProps> = ({
  currentMode,
  receivedMessages,
  connectionState,
  connectedDevice,
  connectedCentrals = [],
  isAdvertising = false
}) => {
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0,
    messagesPerSecond: 0,
    noteOnCount: 0,
    noteOffCount: 0,
    ccCount: 0,
    connectionUptime: 0,
    lastMessageTime: null
  });

  const [connectionStartTime] = useState<Date>(new Date());

  // Update stats when messages change
  useEffect(() => {
    const noteOnCount = receivedMessages.filter(m => m.type === 'Note On').length;
    const noteOffCount = receivedMessages.filter(m => m.type === 'Note Off').length;
    const ccCount = receivedMessages.filter(m => m.type === 'Control Change').length;

    const lastMessage = receivedMessages[receivedMessages.length - 1];
    const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp) : null;

    // Calculate messages per second (over last 10 seconds)
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    const recentMessages = receivedMessages.filter(m => {
      const msgTime = new Date(m.timestamp);
      return msgTime > tenSecondsAgo;
    });
    const messagesPerSecond = recentMessages.length / 10;

    setStats({
      totalMessages: receivedMessages.length,
      messagesPerSecond: Math.round(messagesPerSecond * 10) / 10,
      noteOnCount,
      noteOffCount,
      ccCount,
      connectionUptime: Math.floor((now.getTime() - connectionStartTime.getTime()) / 1000),
      lastMessageTime
    });
  }, [receivedMessages, connectionStartTime]);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatLastActivity = (time: Date | null): string => {
    if (!time) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  const getConnectionStatus = (): { status: string; color: string } => {
    if (currentMode === 'central') {
      switch (connectionState) {
        case 'connected':
          return { status: 'Connected', color: 'text-green-400' };
        case 'connecting':
          return { status: 'Connecting', color: 'text-yellow-400' };
        case 'error':
          return { status: 'Error', color: 'text-red-400' };
        default:
          return { status: 'Disconnected', color: 'text-gray-400' };
      }
    } else {
      if (isAdvertising && connectedCentrals.length > 0) {
        return { status: `${connectedCentrals.length} Connected`, color: 'text-green-400' };
      } else if (isAdvertising) {
        return { status: 'Advertising', color: 'text-yellow-400' };
      } else {
        return { status: 'Stopped', color: 'text-gray-400' };
      }
    }
  };

  const { status, color } = getConnectionStatus();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Connection Statistics</h3>
        <div className={`text-sm font-medium ${color}`}>
          {status}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Connection Info */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Connection</div>
          <div className="text-sm text-white">
            <div>Mode: <span className="font-medium">{currentMode}</span></div>
            <div>Uptime: <span className="font-medium">{formatUptime(stats.connectionUptime)}</span></div>
            {currentMode === 'central' && connectedDevice && (
              <div>Device: <span className="font-medium">{connectedDevice.name}</span></div>
            )}
            {currentMode === 'peripheral' && connectedCentrals.length > 0 && (
              <div>Centrals: <span className="font-medium">{connectedCentrals.length}</span></div>
            )}
          </div>
        </div>

        {/* Message Stats */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Messages</div>
          <div className="text-sm text-white">
            <div>Total: <span className="font-medium">{stats.totalMessages}</span></div>
            <div>Rate: <span className="font-medium">{stats.messagesPerSecond}/s</span></div>
            <div>Last: <span className="font-medium">{formatLastActivity(stats.lastMessageTime)}</span></div>
          </div>
        </div>

        {/* Message Types */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Types</div>
          <div className="text-sm text-white">
            <div>Note On: <span className="font-medium text-green-400">{stats.noteOnCount}</span></div>
            <div>Note Off: <span className="font-medium text-red-400">{stats.noteOffCount}</span></div>
            <div>CC: <span className="font-medium text-blue-400">{stats.ccCount}</span></div>
          </div>
        </div>

        {/* Performance */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Performance</div>
          <div className="text-sm text-white">
            <div>Memory: <span className="font-medium">{Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB</span></div>
            <div>Buffer: <span className="font-medium">{Math.min(receivedMessages.length, 100)}/100</span></div>
            <div className={`${stats.messagesPerSecond > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
              Load: <span className="font-medium">{stats.messagesPerSecond > 10 ? 'High' : 'Normal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              stats.messagesPerSecond > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
            }`}></div>
            <span className="text-sm text-gray-400">
              {stats.messagesPerSecond > 0 ? 'Active' : 'Idle'}
            </span>
          </div>

          {currentMode === 'peripheral' && connectedCentrals.length > 0 && (
            <div className="text-xs text-gray-400">
              MTU: {Math.max(...connectedCentrals.map(c => c.mtu))} bytes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStats;