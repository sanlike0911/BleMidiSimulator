import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDev:', isDev);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(process.cwd(), 'dist/main/main/preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(process.cwd(), 'dist/index.html'));
  }

  return mainWindow;
}

// 基本的なIPC通信ハンドラー
ipcMain.handle('mode:getCurrent', async () => {
  // 暫定実装: 常にcentralを返す
  return 'central';
});

ipcMain.handle('mode:switchTo', async (event, mode: 'central' | 'peripheral') => {
  console.log(`Switching to ${mode} mode`);
  // TODO: 実際のモード切替実装
  return true;
});

ipcMain.handle('central:isAvailable', async () => {
  // TODO: nobleの利用可能性確認
  return true;
});

ipcMain.handle('peripheral:isAvailable', async () => {
  // TODO: blenoの利用可能性確認
  return true;
});

ipcMain.handle('midi:sendMessage', async (event, message: Uint8Array) => {
  console.log('MIDI message to send:', Array.from(message));
  // TODO: 実際のMIDI送信実装
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// セキュリティ設定
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
});