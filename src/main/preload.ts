import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';

// Electron API をレンダラープロセスに安全に公開
const electronAPI: ElectronAPI = {
  // モード管理
  mode: {
    getCurrent: () => ipcRenderer.invoke('mode:getCurrent'),
    switchTo: (mode) => ipcRenderer.invoke('mode:switchTo', mode),
  },

  // Centralモード
  central: {
    isAvailable: () => ipcRenderer.invoke('central:isAvailable'),
    startScan: (nameFilter) => ipcRenderer.invoke('central:startScan', nameFilter),
    stopScan: () => ipcRenderer.invoke('central:stopScan'),
    connect: (deviceId) => ipcRenderer.invoke('central:connect', deviceId),
    disconnect: () => ipcRenderer.invoke('central:disconnect'),
  },

  // Peripheralモード
  peripheral: {
    isAvailable: () => ipcRenderer.invoke('peripheral:isAvailable'),
    startAdvertising: (deviceName) => ipcRenderer.invoke('peripheral:startAdvertising', deviceName),
    stopAdvertising: () => ipcRenderer.invoke('peripheral:stopAdvertising'),
    getConnectedCentrals: () => ipcRenderer.invoke('peripheral:getConnectedCentrals'),
    disconnectCentral: (centralId) => ipcRenderer.invoke('peripheral:disconnectCentral', centralId),
  },

  // MIDI共通
  midi: {
    sendMessage: (message) => ipcRenderer.invoke('midi:sendMessage', message),
  },

  // イベントリスナー
  on: (channel, listener) => {
    ipcRenderer.on(channel, listener);
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Context Bridge を使用してAPIを安全に公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);