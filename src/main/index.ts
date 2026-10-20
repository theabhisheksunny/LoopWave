import { app, session } from 'electron';
import { createMainWindow, getMainWindow } from './window';
import { DatabaseManager } from './storage/db';
import { registerIpcHandlers } from './ipc/handlers';

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

    // Reinforce strict Content Security Policy at session level
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "frame-src https://www.youtube-nocookie.com https://www.youtube.com; " +
            "media-src 'self' blob: data: https: http:; " +
            "img-src 'self' data: https: blob:; " +
            "connect-src 'self' https: blob:;"
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

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
