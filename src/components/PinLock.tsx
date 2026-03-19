"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PinLock({ children, pinEnabled }: { children: React.ReactNode, pinEnabled: boolean }) {
  const [locked, setLocked] = useState(pinEnabled);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    // Check if session has unlock token
    const isUnlocked = sessionStorage.getItem("app_unlocked");
    if (isUnlocked === "true") {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    // Inactivity timer logic
    if (!locked && pinEnabled) {
      let timeout: any;
      const reset = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setLocked(true);
          sessionStorage.removeItem("app_unlocked");
        }, 5 * 60 * 1000); // 5 minutes inactivity
      };
      
      window.addEventListener("mousemove", reset);
      window.addEventListener("keydown", reset);
      window.addEventListener("click", reset);
      window.addEventListener("scroll", reset);
      
      reset();
      
      return () => {
        window.removeEventListener("mousemove", reset);
        window.removeEventListener("keydown", reset);
        window.removeEventListener("click", reset);
        window.removeEventListener("scroll", reset);
        clearTimeout(timeout);
      };
    }
  }, [locked, pinEnabled, pathname]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/pin/verify", {
      method: "POST",
      body: JSON.stringify({ pin }),
      headers: { "Content-Type": "application/json" }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        setLocked(false);
        sessionStorage.setItem("app_unlocked", "true");
        setError("");
        setPin("");
      } else {
        setError("Invalid PIN");
      }
    } else {
      setError("Server Error");
    }
  };

  if (!locked) return <>{children}</>;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#111827", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999 }}>
      <form onSubmit={handleUnlock} style={{ background: "#1f2937", padding: "32px 48px", borderRadius: 12, textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        <h2 style={{ color: "#fff", marginBottom: 8, fontSize: 24, fontWeight: 700 }}>App Locked</h2>
        <p style={{ color: "#9ca3af", marginBottom: 24, fontSize: 14 }}>Enter your 4-digit PIN to continue</p>
        
        <input 
          autoFocus
          type="password" 
          maxLength={4}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(""); }}
          style={{ width: "140px", fontSize: "32px", textAlign: "center", letterSpacing: "12px", padding: "12px", borderRadius: 8, border: "2px solid #374151", background: "#111827", color: "#fff", outline: "none", fontFamily: "monospace" }}
        />
        
        {error && <p style={{ color: "#ef4444", marginTop: 16, fontSize: 14 }}>{error}</p>}
        
        <div style={{ marginTop: 32 }}>
          <button type="submit" disabled={pin.length !== 4} style={{ width: "100%", background: pin.length === 4 ? "#3b82f6" : "#4b5563", color: "#fff", padding: "12px 32px", borderRadius: 8, fontWeight: 600, border: "none", cursor: pin.length === 4 ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
