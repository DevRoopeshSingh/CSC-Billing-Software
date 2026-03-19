"use client";

import { useState } from "react";

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleBackup = () => {
    window.location.href = "/api/backup";
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmWipe = window.confirm(
      "WARNING: Restoring will overwrite ALL current data in this browser! Are you absolutely sure you want to proceed?"
    );
    if (!confirmWipe) {
      e.target.value = ""; // reset
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          const res = await fetch("/api/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json),
          });

          if (res.ok) {
            setMessage({ type: "success", text: "Database restored successfully. Please reload the dashboard." });
          } else {
            const err = await res.json();
            setMessage({ type: "error", text: err.error || "Restore failed." });
          }
        } catch (err) {
          setMessage({ type: "error", text: "Invalid JSON file." });
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to read file." });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Backup & Restore</h2>
        <p className="text-muted">Securely download your database or restore it onto another PC.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type} mb-4`}>
          {message.text}
        </div>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Backup Card */}
        <div className="card text-center" style={{ padding: 40 }}>
          <h3 style={{ marginBottom: 16 }}>Export Database</h3>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            Download a single JSON file containing all your center profile, services, customers, and invoices.
          </p>
          <button className="btn btn-primary btn-block" onClick={handleBackup}>
            ⬇ Download Backup (.json)
          </button>
        </div>

        {/* Restore Card */}
        <div className="card text-center" style={{ padding: 40, border: "1px solid #ef4444" }}>
          <h3 style={{ marginBottom: 16, color: "#dc2626" }}>Restore Database</h3>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            Upload a previously exported JSON backup. <br/>
            <strong>Warning: This will OVERWRITE your current data!</strong>
          </p>
          <input 
            type="file" 
            accept=".json" 
            id="restore-upload" 
            style={{ display: "none" }} 
            onChange={handleRestore} 
            disabled={loading}
          />
          <button 
            className="btn btn-danger btn-block" 
            onClick={() => document.getElementById("restore-upload")?.click()}
            disabled={loading}
          >
            ⬆ {loading ? "Restoring..." : "Upload Backup (.json)"}
          </button>
        </div>
      </div>
    </div>
  );
}
