import { BrowserWindow, app } from 'electron';
import path from 'path';
import { applyWebContentsSecurity } from './security';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#0B0E14',
    show: false,
    frame: false, // Frameless for modern custom titlebar & sleek desktop look
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  applyWebContentsSecurity(mainWindow.webContents);

  // Show window only when ready to avoid visual flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production or built mode, load the bundled HTML
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load local index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
