import { app, session } from 'electron';
import { createMainWindow, getMainWindow } from './window';
import { DatabaseManager } from './storage/db';
import { registerIpcHandlers } from './ipc/handlers';
import { stopLocalServer } from './server';

// Allow programmatic media playback without requiring initial user click on document
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const dbManager = new DatabaseManager();

  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Initialize storage
    const userDataPath = app.getPath('userData');
    await dbManager.init(userDataPath);

    // Register all IPC endpoints
    registerIpcHandlers(dbManager);

    // Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: data: http://127.0.0.1:* http://localhost:*; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.google.com https://*.doubleclick.net http://127.0.0.1:* http://localhost:*; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://127.0.0.1:* http://localhost:*; " +
            "font-src 'self' https://fonts.gstatic.com data: http://127.0.0.1:* http://localhost:*; " +
            "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com; " +
            "media-src 'self' blob: data: https: http:; " +
            "img-src 'self' data: https: blob: http:; " +
            "connect-src 'self' https: blob: http:;"
          ]
        }
      });
    });

    createMainWindow();

    app.on('activate', () => {
      if (!getMainWindow()) {
        createMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    stopLocalServer();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
