"use client";

import { useState, useEffect } from "react";

interface PrinterInfo {
  ip: string;
  port: number;
  interface: string;
}

interface PrinterConfig {
  interface: string;
  type: string;
  printUpiQr: boolean;
}

export default function PrinterSettings() {
  const [config, setConfig] = useState<PrinterConfig>({
    interface: "tcp://192.168.1.100:9100",
    type: "EPSON",
    printUpiQr: false,
  });
  const [scanning, setScanning] = useState(false);
  const [foundPrinters, setFoundPrinters] = useState<PrinterInfo[]>([]);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasElectronApi = typeof window !== "undefined" && !!(window as any).api?.getPrinterConfig;

  useEffect(() => {
    if (hasElectronApi) {
      (window as any).api.getPrinterConfig().then((cfg: PrinterConfig) => {
        if (cfg) setConfig(cfg);
      });
    }
  }, [hasElectronApi]);

  const handleScan = async () => {
    if (!hasElectronApi) return;
    setScanning(true);
    setFoundPrinters([]);
    try {
      const printers = await (window as any).api.listPrinters();
      setFoundPrinters(printers || []);
    } catch {
      setFoundPrinters([]);
    }
    setScanning(false);
  };

  const handleTest = async () => {
    if (!hasElectronApi) return;
    setTestStatus("testing");
    setTestMsg("");
    try {
      const result = await (window as any).api.testPrint(config);
      if (result?.connected) {
        setTestStatus("success");
        setTestMsg("Test page sent successfully!");
      } else {
        setTestStatus("error");
        setTestMsg(result?.error || "Could not connect to printer");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMsg(err instanceof Error ? err.message : "Test failed");
    }
    setTimeout(() => setTestStatus("idle"), 4000);
  };

  const handleSave = async () => {
    if (!hasElectronApi) return;
    setSaving(true);
    await (window as any).api.setPrinterConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        🖨️ Thermal Printer
      </h3>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Configure your ESC/POS receipt printer for direct thermal printing.
      </p>

      {!hasElectronApi && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          Printer settings are only available when running inside the Electron desktop app.
        </div>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="form-group">
          <label>Printer Interface</label>
          <input
            type="text"
            value={config.interface}
            onChange={(e) => setConfig({ ...config, interface: e.target.value })}
            placeholder="tcp://192.168.1.100:9100"
            disabled={!hasElectronApi}
          />
          <span className="text-muted" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            Examples: tcp://192.168.1.100:9100 · usb · COM3
          </span>
        </div>

        <div className="form-group">
          <label>Printer Type</label>
          <select
            value={config.type}
            onChange={(e) => setConfig({ ...config, type: e.target.value })}
            disabled={!hasElectronApi}
          >
            <option value="EPSON">Epson (most common)</option>
            <option value="STAR">Star</option>
          </select>
        </div>
      </div>

      {/* Scan for printers */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <button
          className="btn btn-ghost"
          onClick={handleScan}
          disabled={scanning || !hasElectronApi}
        >
          {scanning ? "Scanning network…" : "🔍 Scan for Printers (port 9100)"}
        </button>
        {foundPrinters.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Found {foundPrinters.length} printer(s):
            </p>
            {foundPrinters.map((p) => (
              <button
                key={p.ip}
                className="btn btn-ghost btn-sm"
                style={{ marginRight: 8, marginBottom: 4 }}
                onClick={() => setConfig({ ...config, interface: p.interface })}
              >
                📡 {p.ip}:{p.port}
              </button>
            ))}
          </div>
        )}
        {scanning === false && foundPrinters.length === 0 && (
          <span className="text-muted" style={{ fontSize: 12, marginLeft: 12 }}>
            No printers found on local network
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          className={`btn ${testStatus === "success" ? "btn-success" : testStatus === "error" ? "btn-danger" : "btn-ghost"}`}
          onClick={handleTest}
          disabled={testStatus === "testing" || !hasElectronApi}
          style={{ minWidth: 140 }}
        >
          {testStatus === "testing" ? "Testing…" : testStatus === "success" ? "✓ Success" : testStatus === "error" ? "✕ Failed" : "🧪 Test Print"}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !hasElectronApi}
        >
          {saved ? "✓ Saved" : saving ? "Saving…" : "Save Printer Settings"}
        </button>
      </div>

      {testMsg && (
        <p style={{ marginTop: 8, fontSize: 13, color: testStatus === "success" ? "#16a34a" : "#ef4444" }}>
          {testMsg}
        </p>
      )}
    </div>
  );
}
