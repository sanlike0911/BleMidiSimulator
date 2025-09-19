// 共通型定義

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type BluetoothMode = 'central' | 'peripheral';

export interface MidiDeviceState {
  device: any | null;
  status: ConnectionStatus;
  error?: string;
}

export interface ParsedMidiMessage {
  id: number;
  timestamp: string;
  type: 'Note On' | 'Note Off' | 'Control Change' | 'Unknown';
  channel: number;
  data1: number;
  data2: number;
  description: string;
}

export interface CentralInfo {
  id: string;
  address?: string;
  name?: string;
  connectionTime: Date;
  lastActivity: Date;
  mtu: number;
}

// IPC API インターフェース
export interface ElectronAPI {
  // モード管理
  mode: {
    getCurrent(): Promise<BluetoothMode>;
    switchTo(mode: BluetoothMode): Promise<void>;
  };

  // Centralモード
  central: {
    isAvailable(): Promise<boolean>;
    startScan(nameFilter?: string): Promise<void>;
    stopScan(): Promise<void>;
    connect(deviceId: string): Promise<void>;
    disconnect(): Promise<void>;
  };

  // Peripheralモード
  peripheral: {
    isAvailable(): Promise<boolean>;
    startAdvertising(deviceName: string): Promise<void>;
    stopAdvertising(): Promise<void>;
    getConnectedCentrals(): Promise<CentralInfo[]>;
    disconnectCentral(centralId: string): Promise<void>;
  };

  // MIDI共通
  midi: {
    sendMessage(message: Uint8Array): Promise<void>;
  };

  on(channel: string, listener: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
}

// イベント型定義
export interface ElectronEvents {
  // 共通イベント
  'bluetooth:error': (error: string) => void;
  'midi:messageReceived': (message: ParsedMidiMessage) => void;
  'mode:changed': (mode: BluetoothMode) => void;

  // Centralモード固有
  'bluetooth:deviceFound': (device: any) => void;
  'bluetooth:connected': (device: any) => void;
  'bluetooth:disconnected': () => void;

  // Peripheralモード固有
  'peripheral:advertisingStarted': () => void;
  'peripheral:advertisingStopped': () => void;
  'peripheral:centralConnected': (centralInfo: CentralInfo) => void;
  'peripheral:centralDisconnected': (centralId: string) => void;
}

// グローバル型拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}