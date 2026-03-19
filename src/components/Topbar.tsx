"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";

export default function Topbar() {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => setCurrentTime(format(new Date(), "EEEE, MMM d, yyyy"));
    updateTime();
    // No need to update every second since we just show the date, but fine to run once
  }, []);

  // Map routes to human readable titles
  const getPageTitle = (path: string) => {
    if (path === "/") return "Overview";
    if (path.startsWith("/billing/new")) return "Create Invoice";
    if (path.startsWith("/invoices")) return "Invoices";
    if (path.startsWith("/customers")) return "Customers";
    if (path.startsWith("/services")) return "Services";
    if (path.startsWith("/reports")) return "Reports";
    if (path.startsWith("/center")) return "Center Setup";
    if (path.startsWith("/settings")) return "Settings";
    return "CSC Billing";
  };

  return (
    <header className="top-bar">
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
          {getPageTitle(pathname)}
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, marginTop: "2px" }}>
          {currentTime}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Global Search (Placeholder) */}
        <div style={{ position: "relative" }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search..."
            style={{
              padding: "8px 16px 8px 36px",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              fontSize: "13px",
              width: "220px"
            }}
          />
        </div>

        {/* Notifications */}
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "20px", height: "20px" }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>

        {/* User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>Admin</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>CSC Center</span>
          </div>
        </div>
      </div>
    </header>
  );
}
