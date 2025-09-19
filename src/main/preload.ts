import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';

// Electron API をレンダラープロセスに安全に公開
const electronAPI: ElectronAPI = {
  // モード管理
  mode: {
    getCurrent: () => ipcRenderer.invoke('mode:getCurrent'),
    switchTo: (mode) => ipcRenderer.invoke('mode:switchTo', mode),
    initialize: () => ipcRenderer.invoke('mode:initialize'),
  },

  // Centralモード
  central: {
    isAvailable: () => ipcRenderer.invoke('central:isAvailable'),
    initialize: () => ipcRenderer.invoke('central:initialize'),
    startScan: (nameFilter) => ipcRenderer.invoke('central:startScan', nameFilter),
    stopScan: () => ipcRenderer.invoke('central:stopScan'),
    connect: (deviceId) => ipcRenderer.invoke('central:connect', deviceId),
    disconnect: () => ipcRenderer.invoke('central:disconnect'),
    sendMidiMessage: (message) => ipcRenderer.invoke('central:sendMidiMessage', message),
    getConnectionState: () => ipcRenderer.invoke('central:getConnectionState'),
    cleanup: () => ipcRenderer.invoke('central:cleanup'),
  },

  // Peripheralモード
  peripheral: {
    isAvailable: () => ipcRenderer.invoke('peripheral:isAvailable'),
    initialize: () => ipcRenderer.invoke('peripheral:initialize'),
    startAdvertising: (deviceName) => ipcRenderer.invoke('peripheral:startAdvertising', deviceName),
    stopAdvertising: () => ipcRenderer.invoke('peripheral:stopAdvertising'),
    getConnectedCentrals: () => ipcRenderer.invoke('peripheral:getConnectedCentrals'),
    disconnectCentral: (centralId) => ipcRenderer.invoke('peripheral:disconnectCentral', centralId),
    sendMidiMessage: (message) => ipcRenderer.invoke('peripheral:sendMidiMessage', message),
    getAdvertisingStatus: () => ipcRenderer.invoke('peripheral:getAdvertisingStatus'),
    getPeripheralName: () => ipcRenderer.invoke('peripheral:getPeripheralName'),
    cleanup: () => ipcRenderer.invoke('peripheral:cleanup'),
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