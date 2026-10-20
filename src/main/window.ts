import { BrowserWindow, app } from 'electron';
import path from 'path';
import { applyWebContentsSecurity } from './security';
import { startLocalServer } from './server';

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
    // Serve renderer bundle via local loopback server to guarantee legitimate HTTP origin for embeds
    const rendererDir = path.join(__dirname, '../renderer');
    startLocalServer(rendererDir)
      .then((baseUrl) => {
        mainWindow?.loadURL(baseUrl);
      })
      .catch((err) => {
        console.error('Failed to start local server, falling back to file:// loadFile:', err);
        const indexPath = path.join(__dirname, '../renderer/index.html');
        mainWindow?.loadFile(indexPath);
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
