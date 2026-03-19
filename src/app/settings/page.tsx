"use client";

import { useState, useEffect } from "react";
import { CenterProfile } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<CenterProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [pinStatus, setPinStatus] = useState({ type: "", message: "" });
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "" });

  useEffect(() => {
    fetch("/api/center")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
        // Apply theme on load
        if (data.theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: profile.theme,
          defaultTaxRate: profile.defaultTaxRate,
          defaultPaymentMode: profile.defaultPaymentMode,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setStatus({ type: "success", message: "Global preferences saved successfully." });
      
      // Apply theme
      if (profile.theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePinUpdate = async (action: "set" | "remove") => {
    setPinStatus({ type: "", message: "" });
    try {
      const res = await fetch("/api/pin/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          currentPin: pinForm.currentPin,
          pin: action === "set" ? pinForm.newPin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed context");
      setPinStatus({ type: "success", message: data.message });
      setPinForm({ currentPin: "", newPin: "" });
      
      // Update local profile hasPin indicator
      if (action === "set") setProfile({ ...profile, hasPin: true });
      if (action === "remove") setProfile({ ...profile, hasPin: false });

    } catch (err: any) {
      setPinStatus({ type: "error", message: err.message });
    }
  };

  if (loading) return <p className="text-muted mt-24 text-center">Loading settings...</p>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h2>App Settings</h2>
        <a href="/settings/backup" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          💾 Backup & Restore
        </a>
      </div>

      {status.message && (
        <div className={`alert ${status.type === "success" ? "alert-success" : "alert-error"}`}>
          {status.message}
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Global Preferences</h3>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Adjust themes and default values auto-populated on new bills.
        </p>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>App Theme</label>
            <select 
              value={profile.theme || "light"} 
              onChange={e => setProfile({ ...profile, theme: e.target.value })}
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>

          <div className="form-group">
            <label>Default Payment Mode</label>
            <select 
              value={profile.defaultPaymentMode || "Cash"} 
              onChange={e => setProfile({ ...profile, defaultPaymentMode: e.target.value })}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Global Default Tax Rate (%)</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              step="0.01" 
              value={profile.defaultTaxRate || 0} 
              onChange={e => setProfile({ ...profile, defaultTaxRate: Number(e.target.value) })}
            />
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      <div className="card mt-24" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>App Security PIN</h3>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          {profile.hasPin 
            ? "A PIN is currently configuring. Set a new one or remove it." 
            : "Protect your app with a 4-digit PIN."}
        </p>

        {pinStatus.message && (
          <div className={`alert ${pinStatus.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
            {pinStatus.message}
          </div>
        )}

        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {profile.hasPin && (
            <div className="form-group">
              <label>Current PIN</label>
              <input 
                type="password" 
                maxLength={4}
                value={pinForm.currentPin} 
                onChange={e => setPinForm({...pinForm, currentPin: e.target.value.replace(/\D/g, '')})}
                placeholder="****"
              />
            </div>
          )}
          
          <div className="form-group">
            <label>New PIN (4 digits)</label>
            <input 
              type="password" 
              maxLength={4}
              value={pinForm.newPin} 
              onChange={e => setPinForm({...pinForm, newPin: e.target.value.replace(/\D/g, '')})}
              placeholder="****"
            />
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1", display: "flex", gap: 12, marginTop: 8 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => handlePinUpdate("set")}
              disabled={pinForm.newPin.length !== 4 || (!!profile.hasPin && pinForm.currentPin.length !== 4)}
            >
              Set / Update PIN
            </button>
            {profile.hasPin && (
              <button 
                className="btn btn-danger" 
                style={{ background: "#ef4444", color: "#fff", border: "none" }}
                onClick={() => handlePinUpdate("remove")}
                disabled={pinForm.currentPin.length !== 4}
              >
                Remove PIN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
