"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";

export default function WizardPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    centerName: "", address: "", mobile: "", email: "", udyamNumber: "",
    logoPath: "", upiQrPath: ""
  });
  const [seedCSC, setSeedCSC] = useState(true);
  const [uploading, setUploading] = useState<{ logo?: boolean; upiQr?: boolean }>({});
  const [errors, setErrors] = useState<{ centerName?: string; email?: string; mobile?: string }>({});

  const uploadFile = async (file: File, field: "logo" | "upiQr") => {
    setUploading(p => ({ ...p, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.path) {
        setForm(p => ({ ...p, [field === "logo" ? "logoPath" : "upiQrPath"]: data.path }));
      }
    } finally {
      setUploading(p => ({ ...p, [field]: false }));
    }
  };

  const finishSetup = async () => {
    if (!form.centerName) {
      toast("Center Name is required", "warning");
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (seedCSC) {
        await fetch("/api/seed", { method: "POST" });
      }
      setStep(5); // Show completion
      setTimeout(() => {
        toast("Setup Complete! Welcome.", "success");
        router.push("/");
      }, 1500);
    } catch (err) {
      toast("Failed to complete setup", "error");
      setLoading(false);
    }
  };

  const handleNextStep1 = () => {
    const newErrors: any = {};
    if (!form.centerName.trim()) {
      newErrors.centerName = "Center Name is required.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setStep(2);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "New Bill", href: "/billing/new" },
    { label: "Invoices", href: "/invoices" },
    { label: "Reports", href: "/reports" },
    { label: "Customers", href: "/customers" },
    { label: "Services", href: "/services" },
    { label: "Center Setup", href: "/wizard", active: true },
    { label: "Settings & Backup", href: "/settings" }
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>CSC Billing</h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Local Management System</p>
        </div>
      </header>

      {/* Top Horizontal Nav Bar */}
      <nav style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "0 32px", overflowX: "auto" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "28px", whiteSpace: "nowrap" }}>
          {navItems.map(item => (
            <li key={item.label}>
              <Link href={item.href} style={{
                display: "block",
                padding: "16px 0 14px 0",
                color: item.active ? "#1a56db" : "#4b5563",
                fontWeight: item.active ? 600 : 500,
                fontSize: "14px",
                textDecoration: "none",
                borderBottom: item.active ? "2px solid #1a56db" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.2s"
              }}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content Container */}
      <main style={{ flex: 1, padding: "48px 20px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          
          {/* Visual Stepper */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", margin: "0 0 12px 0" }}>
              Step {step} of 5 &ndash; {
                step === 1 ? 'Center Details' : 
                step === 2 ? 'Upload Branding' : 
                step === 3 ? 'Pre-load Services' : 
                step === 4 ? 'Review & Save' : 'Completion'
              }
            </h2>
            
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  height: "4px",
                  flex: 1,
                  backgroundColor: step >= i ? "#1a56db" : "#e5e7eb",
                  borderRadius: "2px",
                  transition: "background-color 0.3s ease"
                }} />
              ))}
            </div>
          </div>

          {/* Card Wrapper for Form */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05)", padding: "32px", border: "1px solid #e5e7eb" }}>
            
            {step === 1 && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Center Name */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="centerName" style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      Center Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input 
                      id="centerName"
                      autoFocus
                      required
                      value={form.centerName}
                      onChange={e => { setForm({...form, centerName: e.target.value}); setErrors({...errors, centerName: undefined}); }}
                      placeholder="e.g. Om Digital Services"
                      style={{ 
                        width: "100%", padding: "10px 14px", 
                        border: errors.centerName ? "1px solid #ef4444" : "1px solid #d1d5db", 
                        borderRadius: "8px", fontSize: "15px", color: "#111827", outline: "none",
                        boxSizing: "border-box", transition: "border-color 0.2s"
                      }}
                    />
                    {errors.centerName && (
                      <span style={{ fontSize: "13px", color: "#ef4444", marginTop: "2px" }}>{errors.centerName}</span>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="mobile" style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      Mobile Number
                    </label>
                    <input 
                      id="mobile"
                      type="tel"
                      value={form.mobile}
                      onChange={e => setForm({...form, mobile: e.target.value})}
                      placeholder="e.g. 9876543210"
                      style={{ 
                        width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", 
                        borderRadius: "8px", fontSize: "15px", color: "#111827", outline: "none",
                        boxSizing: "border-box", transition: "border-color 0.2s"
                      }}
                    />
                  </div>

                  {/* Email ID */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="email" style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      Email ID
                    </label>
                    <input 
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={e => { setForm({...form, email: e.target.value}); setErrors({...errors, email: undefined}); }}
                      placeholder="e.g. contact@center.com"
                      style={{ 
                        width: "100%", padding: "10px 14px", 
                        border: errors.email ? "1px solid #ef4444" : "1px solid #d1d5db", 
                        borderRadius: "8px", fontSize: "15px", color: "#111827", outline: "none",
                        boxSizing: "border-box", transition: "border-color 0.2s"
                      }}
                    />
                    {errors.email && (
                      <span style={{ fontSize: "13px", color: "#ef4444", marginTop: "2px" }}>{errors.email}</span>
                    )}
                  </div>

                  {/* Full Address */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="address" style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      Full Address
                    </label>
                    <textarea 
                      id="address"
                      value={form.address}
                      onChange={e => setForm({...form, address: e.target.value})}
                      placeholder="Complete physical address..."
                      rows={3}
                      style={{ 
                        width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", 
                        borderRadius: "8px", fontSize: "15px", color: "#111827", outline: "none",
                        boxSizing: "border-box", resize: "vertical", transition: "border-color 0.2s",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>

                  {/* Udyam */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="udyam" style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      Udyam Registration No.
                    </label>
                    <input 
                      id="udyam"
                      type="text"
                      value={form.udyamNumber}
                      onChange={e => setForm({...form, udyamNumber: e.target.value})}
                      placeholder="e.g. UDYAM-XX-00-0000000"
                      style={{ 
                        width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", 
                        borderRadius: "8px", fontSize: "15px", color: "#111827", outline: "none",
                        boxSizing: "border-box", transition: "border-color 0.2s"
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Leave blank if you don't have Udyam registration.</span>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                  <button 
                    onClick={() => {}}
                    style={{ 
                      padding: "10px 24px", backgroundColor: "transparent", color: "#6b7280", 
                      border: "1px solid transparent", borderRadius: "8px", fontSize: "15px", 
                      fontWeight: 600, cursor: "not-allowed", opacity: 0.5 
                    }}
                    disabled
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleNextStep1}
                    style={{ 
                      padding: "10px 24px", backgroundColor: "#1a56db", color: "#ffffff", 
                      border: "none", borderRadius: "8px", fontSize: "15px", 
                      fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    Next: Uploads
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ padding: "32px", border: "1px dashed #d1d5db", borderRadius: "8px", textAlign: "center", backgroundColor: "#f9fafb" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "16px" }}>Center Logo</label>
                    {form.logoPath ? (
                      <img src={form.logoPath} alt="Logo" style={{ height: 80, objectFit: "contain", margin: "0 auto 16px" }} />
                    ) : (
                      <div style={{ height: 60, width: 60, background: "#e5e7eb", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>No Logo</div>
                    )}
                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")} disabled={uploading.logo} style={{ fontSize: "14px" }} />
                    {uploading.logo && <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>Uploading...</p>}
                  </div>

                  <div style={{ padding: "32px", border: "1px dashed #d1d5db", borderRadius: "8px", textAlign: "center", backgroundColor: "#f9fafb" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "16px" }}>UPI QR Code</label>
                    {form.upiQrPath ? (
                      <img src={form.upiQrPath} alt="QR" style={{ height: 80, objectFit: "contain", margin: "0 auto 16px" }} />
                    ) : (
                      <div style={{ height: 60, width: 60, background: "#e5e7eb", borderRadius: "8px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>No QR</div>
                    )}
                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "upiQr")} disabled={uploading.upiQr} style={{ fontSize: "14px" }} />
                    {uploading.upiQr && <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>Uploading...</p>}
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                  <button onClick={() => setStep(1)} style={{ padding: "10px 24px", backgroundColor: "transparent", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>Back</button>
                  <button onClick={() => setStep(3)} style={{ padding: "10px 24px", backgroundColor: "#1a56db", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Next: Services</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p style={{ color: "#4b5563", marginBottom: "24px", fontSize: "15px", lineHeight: 1.5 }}>Quickly start billing by auto-importing standard CSC services like Aadhaar updates, PAN card applications, and utility bill payments.</p>
                
                <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 500, fontSize: "15px", color: "#111827" }}>
                  <input type="checkbox" checked={seedCSC} onChange={e => setSeedCSC(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#1a56db" }} />
                  Load standard CSC Service Templates
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                  <button onClick={() => setStep(2)} style={{ padding: "10px 24px", backgroundColor: "transparent", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>Back</button>
                  <button onClick={() => setStep(4)} style={{ padding: "10px 24px", backgroundColor: "#1a56db", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Review & Finish</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 80, height: 80, background: "#10b981", color: "#fff", borderRadius: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", margin: "0 auto 24px", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}>✓</div>
                <h3 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", color: "#111827" }}>Your center is almost ready!</h3>
                <p style={{ color: "#6b7280", marginBottom: "40px", fontSize: "15px" }}>Review your setup and click finish to start billing safely offline.</p>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                  <button onClick={() => setStep(3)} style={{ padding: "10px 24px", backgroundColor: "transparent", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }} disabled={loading}>Back</button>
                  <button onClick={finishSetup} disabled={loading} style={{ padding: "10px 32px", backgroundColor: "#10b981", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Finalizing..." : "Finish Setup"}
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ width: 48, height: 48, borderTop: "4px solid #1a56db", borderRight: "4px solid transparent", borderRadius: "50%", margin: "0 auto 24px", animation: "spin 1s linear infinite" }} />
                <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#111827" }}>Redirecting to Dashboard...</h3>
                <style dangerouslySetInnerHTML={{__html: "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}} />
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
