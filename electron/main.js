const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
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

// ── Thermal Printer Setup ──────────────────────────────────────────────────
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

// Printer settings stored in memory (loaded from renderer via IPC or defaults)
let printerConfig = {
  interface: 'tcp://192.168.1.100:9100',
  type: 'EPSON',
  printUpiQr: false,
};

function createPrinter(config) {
  return new ThermalPrinter({
    type: PrinterTypes[config.type || 'EPSON'] || PrinterTypes.EPSON,
    interface: config.interface,
    characterSet: 'PC437_USA',
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: { timeout: 3000 },
  });
}

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

  // ── Daily Digest Notification ───────────────────────────────────────────
  scheduleDailyDigest();
}

app.whenReady().then(() => {
  // ── Existing IPC ───────────────────────────────────────────────────────────
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-db-path', () => dbPath);

  // ── Thermal Printer IPC ────────────────────────────────────────────────────
  ipcMain.handle('print-receipt', async (_event, invoice) => {
    try {
      const printer = createPrinter(printerConfig);
      const isConnected = await printer.isPrinterConnected();
      if (!isConnected) {
        return { success: false, error: 'Printer not reachable. Check connection.' };
      }

      // Header
      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println(invoice.centerName || 'CSC Center');
      printer.bold(false);
      printer.setTextNormal();
      if (invoice.centerAddress) printer.println(invoice.centerAddress);
      if (invoice.centerPhone) printer.println(`Ph: ${invoice.centerPhone}`);
      printer.drawLine();

      // Invoice meta
      printer.alignLeft();
      printer.println(`Invoice: ${invoice.invoiceNo}`);
      printer.println(`Date:    ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`);
      if (invoice.customerName) {
        printer.println(`Name:    ${invoice.customerName}`);
      }
      printer.drawLine();

      // Line items
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item) => {
          const desc = (item.description || '').substring(0, 22);
          const total = Number(item.lineTotal || 0).toFixed(2);
          printer.leftRight(desc, `Rs.${total}`);
          if (item.taxRate > 0) {
            const taxAmt = (item.qty * item.rate * item.taxRate / 100).toFixed(2);
            printer.leftRight(`  GST ${item.taxRate}%`, `Rs.${taxAmt}`);
          }
        });
      }

      printer.drawLine();

      // Totals
      printer.leftRight('Subtotal', `Rs.${Number(invoice.subtotal || 0).toFixed(2)}`);
      if (invoice.taxTotal > 0) {
        printer.leftRight('GST Total', `Rs.${Number(invoice.taxTotal).toFixed(2)}`);
      }
      if (invoice.discount > 0) {
        printer.leftRight('Discount', `-Rs.${Number(invoice.discount).toFixed(2)}`);
      }
      printer.bold(true);
      printer.leftRight('TOTAL', `Rs.${Number(invoice.total || 0).toFixed(2)}`);
      printer.bold(false);
      printer.drawLine();

      // Payment mode
      printer.alignCenter();
      printer.println(`Payment: ${invoice.paymentMode || 'Cash'}`);

      // Footer
      printer.println('Thank you for visiting!');
      printer.newLine();

      // Cut
      printer.cut();

      // Execute
      await printer.execute();
      printer.clear();

      return { success: true };
    } catch (err) {
      console.error('[IPC print-receipt]', err);
      return { success: false, error: err.message || 'Print failed' };
    }
  });

  ipcMain.handle('test-print', async (_event, config) => {
    try {
      if (config) {
        // Update stored config
        printerConfig = { ...printerConfig, ...config };
      }
      const printer = createPrinter(printerConfig);
      const connected = await printer.isPrinterConnected();
      if (!connected) return { connected: false, error: 'Printer not reachable' };

      printer.alignCenter();
      printer.bold(true);
      printer.println('CSC Billing');
      printer.bold(false);
      printer.println('Test print successful!');
      printer.println(new Date().toLocaleString('en-IN'));
      printer.cut();
      await printer.execute();
      printer.clear();
      return { connected: true };
    } catch (err) {
      console.error('[IPC test-print]', err);
      return { connected: false, error: err.message };
    }
  });

  ipcMain.handle('list-printers', async () => {
    try {
      const { scanForPrinters } = require('./printerScan');
      return await scanForPrinters();
    } catch (err) {
      console.error('[IPC list-printers]', err);
      return [];
    }
  });

  ipcMain.handle('set-printer-config', async (_event, config) => {
    printerConfig = { ...printerConfig, ...config };
    return { success: true };
  });

  ipcMain.handle('get-printer-config', async () => {
    return printerConfig;
  });

  // ── Create Window ──────────────────────────────────────────────────────────
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  // Auto-backup on exit
  try {
    await performAutoBackup();
  } catch (err) {
    console.error('[Auto-backup]', err);
  }
  if (nextProcess) {
    nextProcess.kill();
  }
});

// ── Auto-Backup ────────────────────────────────────────────────────────────
async function performAutoBackup() {
  const backupDir = path.join(app.getPath('documents'), 'CSC-Backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Only backup if DB exists
  if (!fs.existsSync(dbPath)) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupFile = path.join(backupDir, `csc_billing_auto_${timestamp}.db`);

  // Skip if today's backup already exists
  if (fs.existsSync(backupFile)) return;

  fs.copyFileSync(dbPath, backupFile);
  console.log(`[Auto-backup] Saved to ${backupFile}`);

  // Keep only last 7 auto-backups
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('csc_billing_auto_') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (let i = 7; i < files.length; i++) {
    fs.unlinkSync(path.join(backupDir, files[i]));
    console.log(`[Auto-backup] Pruned old backup: ${files[i]}`);
  }
}

// ── Daily Digest Notification ──────────────────────────────────────────────
function scheduleDailyDigest() {
  // Check every 30 minutes; fire notification at ~8 PM
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 20 && now.getMinutes() < 30) {
      showDailyDigest();
    }
  }, 30 * 60 * 1000); // every 30 min
}

let digestShownToday = '';

async function showDailyDigest() {
  const todayStr = new Date().toISOString().split('T')[0];
  if (digestShownToday === todayStr) return; // already shown today
  digestShownToday = todayStr;

  try {
    // Read today's stats via the Next.js API (internal server)
    const http = require('http');
    const data = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/reports?type=daily&start=' + todayStr + '&end=' + todayStr, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      }).on('error', reject);
    });

    if (!data) return;

    const invoices = data.invoices || [];
    const total = invoices.reduce((s, inv) => s + (inv.total || 0), 0);

    if (Notification.isSupported()) {
      new Notification({
        title: 'CSC Billing — Daily Summary',
        body: `Today: ${invoices.length} invoices, Total: ₹${total.toFixed(0)}`,
        silent: false,
      }).show();
    }
  } catch (err) {
    console.error('[Daily digest]', err.message);
  }
}
