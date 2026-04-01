const { contextBridge, ipcRenderer } = require('electron');

// Original electronAPI namespace (backward compatible)
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
});

// New api namespace for Phase 1 features
contextBridge.exposeInMainWorld('api', {
  // Thermal printer
  printReceipt: (invoice) => ipcRenderer.invoke('print-receipt', invoice),
  listPrinters: () => ipcRenderer.invoke('list-printers'),
  testPrint: (config) => ipcRenderer.invoke('test-print', config),
  setPrinterConfig: (config) => ipcRenderer.invoke('set-printer-config', config),
  getPrinterConfig: () => ipcRenderer.invoke('get-printer-config'),

  // Existing
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
});
