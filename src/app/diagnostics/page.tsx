import { prisma } from "@/lib/prisma";
import { resolve } from "path";
import fs from "fs";

export default async function DiagnosticsPage() {
  const [customerCount, serviceCount, invoiceCount, profile] = await Promise.all([
    prisma.customer.count(),
    prisma.service.count(),
    prisma.invoice.count(),
    prisma.centerProfile.findUnique({ where: { id: 1 } }),
  ]);

  let dbSize = "Unknown";
  let dbLocation = "Unknown";

  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
    const absolutePath = resolve(dbPath);
    if (fs.existsSync(absolutePath)) {
      dbLocation = absolutePath;
      const stats = fs.statSync(absolutePath);
      dbSize = (stats.size / 1024 / 1024).toFixed(2) + " MB";
    }
  } catch (e) {
    console.error(e);
  }

  const isPackaged = process.env.USER_DATA_PATH ? "Yes (Electron Production)" : "No (Development / Web)";

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h2>System Diagnostics</h2>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 }}>Application Health</h3>
        
        <table style={{ width: "100%", textAlign: "left", fontSize: 14 }}>
          <tbody>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", width: "40%", color: "#6b7280" }}>App Mode</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>{isPackaged}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Database Engine</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>SQLite (Local)</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Database Path</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontFamily: "monospace", fontSize: 13 }}>{dbLocation}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Database Size</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>{dbSize}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>Last Backup</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
                {profile?.lastBackupDate ? new Date(profile.lastBackupDate).toLocaleString() : "Never"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>User Data Path</td>
              <td style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", fontWeight: 500, fontFamily: "monospace", fontSize: 13 }}>{process.env.USER_DATA_PATH || "Not set"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-24">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 }}>Records Metric</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "center" }}>
          <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1a56db" }}>{invoiceCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Total Invoices</div>
          </div>
          <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{customerCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Customers</div>
          </div>
          <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#8b5cf6" }}>{serviceCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Services</div>
          </div>
        </div>
      </div>
    </div>
  );
}
