// src/main/printerScan.ts
// Scan local subnet for ESC/POS thermal printers on port 9100.

import net from "net";
import os from "os";

function getLocalSubnet(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const config of iface) {
      if (config.family === "IPv4" && !config.internal) {
        const parts = config.address.split(".");
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  }
  return "192.168.1";
}

function checkPort(host: string, port = 9100, timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function scanForPrinters() {
  const subnet = getLocalSubnet();
  const hosts: string[] = [];
  for (let i = 1; i <= 254; i++) hosts.push(`${subnet}.${i}`);
  const results = await Promise.all(hosts.map((h) => checkPort(h)));
  return hosts
    .filter((_, i) => results[i])
    .map((h) => ({ ip: h, port: 9100, interface: `tcp://${h}:9100` }));
}
