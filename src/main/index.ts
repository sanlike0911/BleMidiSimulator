import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initializeCentralHandlers } from './ipc/central-handlers';
import { initializePeripheralHandlers } from './ipc/peripheral-handlers';
import { ModeController } from './bluetooth/mode-controller';

const isDev = process.env.NODE_ENV === 'development';
let modeController: ModeController | null = null;

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
    mainWindow.loadFile(path.join(process.cwd(), 'dist/renderer/index.html'));
  }

  return mainWindow;
}

// Mode Controller IPC handlers
ipcMain.handle('mode:getCurrent', async () => {
  if (!modeController) {
    return 'central'; // Default mode
  }
  return modeController.getCurrentMode();
});

ipcMain.handle('mode:switchTo', async (event, mode: 'central' | 'peripheral') => {
  console.log(`Switching to ${mode} mode`);
  try {
    if (!modeController) {
      modeController = new ModeController();
      await modeController.initialize();
    }
    await modeController.switchMode(mode);
    return true;
  } catch (error) {
    console.error('Failed to switch mode:', error);
    throw error;
  }
});

ipcMain.handle('mode:initialize', async () => {
  try {
    if (!modeController) {
      modeController = new ModeController();
      await modeController.initialize();
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize mode controller:', error);
    throw error;
  }
});

// Legacy handler for compatibility - now uses mode controller
ipcMain.handle('midi:sendMessage', async (event, message: Uint8Array) => {
  console.log('MIDI send handler via mode controller');
  try {
    if (!modeController) {
      throw new Error('Mode controller not initialized');
    }
    await modeController.sendMidiMessage(message);
    return true;
  } catch (error) {
    console.error('Failed to send MIDI message:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  // Initialize IPC handlers
  initializeCentralHandlers();
  initializePeripheralHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  // Cleanup mode controller
  if (modeController) {
    try {
      await modeController.cleanup();
    } catch (error) {
      console.error('Error during mode controller cleanup:', error);
    }
  }
});

// セキュリティ設定
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
});