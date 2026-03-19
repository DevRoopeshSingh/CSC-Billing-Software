const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let nextProcess;

// Configure paths for self-contained execution
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'csc_billing.db');
const uploadsPath = path.join(userDataPath, 'uploads');

// Export Env Vars to any processes Electron starts
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.USER_DATA_PATH = userDataPath;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/icon.svg')
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start the Next.js server locally
    const nextPath = path.join(__dirname, '../node_modules/next/dist/bin/next');
    
    nextProcess = spawn('node', [nextPath, 'start', '-p', '3000'], {
      env: {
        ...process.env,
        PORT: '3000',
        DATABASE_URL: `file:${dbPath}`,
        USER_DATA_PATH: userDataPath
      }
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`Next Server: ${data}`);
      if (data.toString().includes('ready') || data.toString().includes('started server on')) {
        mainWindow.loadURL('http://localhost:3000');
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`Next Error: ${data}`);
    });

    // Fallback URL load if we miss the stdout string
    setTimeout(() => {
      if(mainWindow.webContents.getURL() === '') {
        mainWindow.loadURL('http://localhost:3000');
      }
    }, 6000);
  }

  // Check for auto updates silently
  autoUpdater.checkForUpdatesAndNotify().catch(e => console.error(e));
}

app.whenReady().then(() => {
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-db-path', () => dbPath);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
