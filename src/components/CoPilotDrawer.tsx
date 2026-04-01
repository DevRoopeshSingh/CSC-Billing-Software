"use client";

import { useEffect } from "react";
import { useCoPilot } from "./CoPilotContext";
import CoPilotQuickActions from "./CoPilotQuickActions";

export default function CoPilotDrawer() {
  const { isOpen, close, toggle } = useCoPilot();

  // Listen for custom event from Sidebar button
  useEffect(() => {
    const handleToggle = () => toggle();
    window.addEventListener("toggle-copilot", handleToggle);
    return () => window.removeEventListener("toggle-copilot", handleToggle);
  }, [toggle]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="copilot-backdrop"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside className={`copilot-drawer${isOpen ? " open" : ""}`}>
        {/* Header */}
        <div className="copilot-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                Co-Pilot
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                Quick actions & insights
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="copilot-close-btn"
            title="Close (⌘J)"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="copilot-body">
          {/* Phase 1: Quick actions */}
          <CoPilotQuickActions />

          {/* Phase 2 placeholder */}
          <div className="copilot-chat-placeholder">
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>💬</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                AI Chat Coming Soon
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                In the next phase, you&#39;ll be able to ask natural language questions like
                &ldquo;Show Ramesh&apos;s pending bills&rdquo; or &ldquo;Draft a payment reminder&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Footer Input (Phase 2 — disabled for now) */}
        <div className="copilot-footer">
          <input
            type="text"
            placeholder="Ask the co-pilot anything… (coming soon)"
            disabled
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 13,
              background: "var(--surface)",
              color: "var(--text-muted)",
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          />
        </div>
      </aside>
    </>
  );
}
