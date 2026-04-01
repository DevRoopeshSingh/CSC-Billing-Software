"use client";

import { useState, useEffect, useRef } from "react";
import { CenterProfile } from "@/types";

export default function CenterPage() {
  const [profile, setProfile] = useState<CenterProfile | null>(null);
  const [form, setForm] = useState<Partial<CenterProfile>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState<{ logo?: boolean; upiQr?: boolean }>({});
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [loadTemplates, setLoadTemplates] = useState(true);

  const logoRef = useRef<HTMLInputElement>(null);
  const upiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/center")
      .then((r) => r.json())
      .then((data: CenterProfile) => {
        setProfile(data);
        setForm(data);
        if (!data.centerName) {
          setIsFirstSetup(true);
        }
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileUpload = async (
    file: File,
    field: "logo" | "upiQr"
  ) => {
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.path) {
        setForm((prev) => ({
          ...prev,
          [field === "logo" ? "logoPath" : "upiQrPath"]: data.path,
        }));
      }
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        
        if (isFirstSetup && loadTemplates) {
          await fetch("/api/seed", { method: "POST" });
          setIsFirstSetup(false);
          setMessage({ type: "success", text: "Center profile saved & default services pre-loaded!" });
        } else {
          setMessage({ type: "success", text: "Center profile saved successfully!" });
        }
      } else {
        setMessage({ type: "error", text: "Failed to save profile." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <p className="text-muted">Loading...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Center Setup</h2>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Basic Information
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="centerName">Center Name *</label>
              <input
                id="centerName"
                name="centerName"
                type="text"
                value={form.centerName ?? ""}
                onChange={handleChange}
                placeholder="My CSC Center"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile Number</label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                value={form.mobile ?? ""}
                onChange={handleChange}
                placeholder="9876543210"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email ?? ""}
                onChange={handleChange}
                placeholder="center@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="udyamNumber">Udyam Registration Number</label>
              <input
                id="udyamNumber"
                name="udyamNumber"
                type="text"
                value={form.udyamNumber ?? ""}
                onChange={handleChange}
                placeholder="UDYAM-XX-00-0000000"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={form.address ?? ""}
                onChange={handleChange}
                placeholder="Shop No., Street, Village/Town, District, State - PIN"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Logo &amp; UPI QR
          </h3>
          <div className="form-grid">
            {/* Logo Upload */}
            <div className="form-group">
              <label>Center Logo</label>
              {form.logoPath && (
                <img
                  src={form.logoPath}
                  alt="Center Logo"
                  className="img-thumb"
                  style={{ marginBottom: 8 }}
                />
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                disabled={uploading.logo}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0], "logo");
                  }
                }}
              />
              {uploading.logo && (
                <span className="text-muted mt-4" style={{ fontSize: 12 }}>
                  Uploading…
                </span>
              )}
            </div>

            {/* UPI QR Upload */}
            <div className="form-group">
              <label>UPI QR Code</label>
              {form.upiQrPath && (
                <img
                  src={form.upiQrPath}
                  alt="UPI QR Code"
                  className="img-thumb"
                  style={{ marginBottom: 8 }}
                />
              )}
              <input
                ref={upiRef}
                type="file"
                accept="image/*"
                disabled={uploading.upiQr}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0], "upiQr");
                  }
                }}
              />
              {uploading.upiQr && (
                <span className="text-muted mt-4" style={{ fontSize: 12 }}>
                  Uploading…
                </span>
              )}
            </div>

            {/* UPI ID (VPA) */}
            <div className="form-group full">
              <label htmlFor="upiId">UPI ID (VPA)</label>
              <input
                id="upiId"
                name="upiId"
                type="text"
                value={(form as any).upiId ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
                placeholder="yourname@upi or 9876543210@paytm"
              />
              <span className="text-muted" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                Used for UPI deep links in WhatsApp invoice shares. Leave blank if not needed.
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Invoice Configuration
          </h3>
          <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
            Control the numbering of your next bill. The final invoice number will look like <strong>{form.invoicePrefix || "INV-"}{new Date().getFullYear()}-{String((form.invoiceNumber || 0) + 1).padStart(5, "0")}</strong>.
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="form-group">
              <label htmlFor="invoicePrefix">Invoice Prefix</label>
              <input
                id="invoicePrefix"
                name="invoicePrefix"
                type="text"
                value={form.invoicePrefix ?? ""}
                onChange={handleChange}
                placeholder="INV-"
              />
            </div>
            <div className="form-group">
              <label htmlFor="invoiceNumber">Current Invoice Counter (Starts at +1)</label>
              <input
                id="invoiceNumber"
                name="invoiceNumber"
                type="number"
                min="0"
                value={form.invoiceNumber ?? 0}
                onChange={(e) => setForm(p => ({ ...p, invoiceNumber: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {isFirstSetup && (
               <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                 <input type="checkbox" checked={loadTemplates} onChange={(e) => setLoadTemplates(e.target.checked)} />
                 Pre-load 12 common CSC services (Aadhaar, Passport, etc.)
               </label>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
