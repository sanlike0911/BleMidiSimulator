import { useEffect, useState } from 'react';
import type { BluetoothMode, ParsedMidiMessage, CentralInfo } from '../../shared/types';

export function useElectronAPI() {
  const [currentMode, setCurrentMode] = useState<BluetoothMode>('central');
  const [receivedMessages, setReceivedMessages] = useState<ParsedMidiMessage[]>([]);

  // Electronの利用可能性チェック
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // 現在のモードを取得
    window.electronAPI.mode.getCurrent().then(setCurrentMode);

    // イベントリスナーの設定
    const handleMidiMessage = (message: ParsedMidiMessage) => {
      setReceivedMessages(prev => [...prev.slice(-99), message]);
    };

    const handleModeChanged = (mode: BluetoothMode) => {
      setCurrentMode(mode);
    };

    window.electronAPI.on('midi:messageReceived', handleMidiMessage);
    window.electronAPI.on('mode:changed', handleModeChanged);

    return () => {
      window.electronAPI.removeAllListeners('midi:messageReceived');
      window.electronAPI.removeAllListeners('mode:changed');
    };
  }, [isElectron]);

  // API関数のラッパー
  const api = {
    // モード管理
    switchMode: async (mode: BluetoothMode) => {
      if (isElectron) {
        await window.electronAPI.mode.switchTo(mode);
        setCurrentMode(mode);
      }
    },

    // MIDI送信
    sendMidiMessage: async (message: Uint8Array) => {
      if (isElectron) {
        return window.electronAPI.midi.sendMessage(message);
      }
      console.warn('Electron API not available');
    },

    // Central操作
    central: isElectron ? {
      startScan: window.electronAPI.central.startScan,
      stopScan: window.electronAPI.central.stopScan,
      connect: window.electronAPI.central.connect,
      disconnect: window.electronAPI.central.disconnect,
    } : null,

    // Peripheral操作
    peripheral: isElectron ? {
      startAdvertising: window.electronAPI.peripheral.startAdvertising,
      stopAdvertising: window.electronAPI.peripheral.stopAdvertising,
      getConnectedCentrals: window.electronAPI.peripheral.getConnectedCentrals,
      disconnectCentral: window.electronAPI.peripheral.disconnectCentral,
    } : null,
  };

  return {
    isElectron,
    currentMode,
    receivedMessages,
    api,
  };
}