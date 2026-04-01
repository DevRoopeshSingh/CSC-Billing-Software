// electron/printerScan.js
// Scans local subnet for devices listening on port 9100 (standard ESC/POS thermal printers)

const net = require('net');
const os = require('os');

function getLocalSubnet() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        const parts = config.address.split('.');
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  }
  return '192.168.1';
}

async function checkPort(host, port = 9100, timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function scanForPrinters() {
  const subnet = getLocalSubnet();
  const checks = [];
  for (let i = 1; i <= 254; i++) {
    checks.push({
      host: `${subnet}.${i}`,
      promise: checkPort(`${subnet}.${i}`),
    });
  }
  const results = await Promise.all(checks.map((c) => c.promise));
  return checks
    .filter((_, i) => results[i])
    .map((c) => ({
      ip: c.host,
      port: 9100,
      interface: `tcp://${c.host}:9100`,
    }));
}

module.exports = { scanForPrinters };
