"use client";

import { useEffect, useState } from "react";

export default function OfflineToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        // If fetch fails and we are offline (or local server is unreachable)
        if (!navigator.onLine || String(error).includes("Failed to fetch")) {
          setToastMessage("You are offline. Data is being saved locally.");
          setTimeout(() => setToastMessage(null), 5000); // Hide after 5 seconds
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch; // Cleanup on unmount
    };
  }, []);

  if (!toastMessage) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      backgroundColor: "#333",
      color: "#fff",
      padding: "16px 24px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "12px",
      animation: "slideIn 0.3s ease-out"
    }}>
      <span style={{ fontSize: "20px" }}>⚠️</span>
      <p style={{ margin: 0, fontWeight: 500 }}>{toastMessage}</p>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
