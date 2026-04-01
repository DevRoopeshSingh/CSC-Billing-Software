"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";

interface QuickActionResult {
  label: string;
  items: { text: string; sub?: string }[];
}

export default function CoPilotQuickActions() {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [result, setResult] = useState<QuickActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAction = async (action: string, input?: string) => {
    setLoading(true);
    setResult(null);

    try {
      switch (action) {
        case "today-revenue": {
          const today = new Date().toISOString().split("T")[0];
          const res = await fetch(`/api/reports?type=daily&start=${today}&end=${today}`);
          const data = await res.json();
          const invoices = data.invoices || [];
          const total = invoices.reduce((s: number, i: any) => s + i.total, 0);
          setResult({
            label: "Today's Revenue",
            items: [
              { text: formatCurrency(total), sub: `from ${invoices.length} invoice(s)` },
            ],
          });
          break;
        }
        case "find-customer": {
          if (!input?.trim()) return;
          const res = await fetch(`/api/customers?search=${encodeURIComponent(input.trim())}`);
          const customers = await res.json();
          setResult({
            label: `Customers matching "${input}"`,
            items: customers.length
              ? customers.slice(0, 5).map((c: any) => ({
                  text: c.name,
                  sub: c.mobile || "No mobile",
                }))
              : [{ text: "No customers found" }],
          });
          break;
        }
        case "pending-bills": {
          const res = await fetch(`/api/invoices?status=PENDING`);
          const invoices = await res.json();
          setResult({
            label: "Pending Bills",
            items: invoices.length
              ? invoices.slice(0, 8).map((inv: any) => ({
                  text: `${inv.invoiceNo} — ${formatCurrency(inv.total)}`,
                  sub: inv.customer?.name || "Unknown",
                }))
              : [{ text: "No pending bills 🎉" }],
          });
          break;
        }
      }
    } catch {
      setResult({ label: "Error", items: [{ text: "Failed to fetch data" }] });
    }

    setLoading(false);
  };

  return (
    <div className="copilot-quick-actions">
      {/* Action Cards */}
      <div className="copilot-action-grid">
        <button
          className="copilot-action-card"
          onClick={() => {
            setActiveAction("today-revenue");
            runAction("today-revenue");
          }}
        >
          <span className="copilot-action-icon">💰</span>
          <span>Today&apos;s Revenue</span>
        </button>

        <button
          className="copilot-action-card"
          onClick={() => {
            setActiveAction("pending-bills");
            runAction("pending-bills");
          }}
        >
          <span className="copilot-action-icon">⏳</span>
          <span>Pending Bills</span>
        </button>

        <button
          className="copilot-action-card"
          onClick={() => setActiveAction("find-customer")}
        >
          <span className="copilot-action-icon">🔍</span>
          <span>Find Customer</span>
        </button>
      </div>

      {/* Find Customer Input */}
      {activeAction === "find-customer" && (
        <div style={{ marginTop: 12 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAction("find-customer", searchInput);
            }}
          >
            <input
              type="text"
              placeholder="Type customer name or mobile…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </form>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="copilot-result-section">
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
        </div>
      )}

      {result && !loading && (
        <div className="copilot-result-section">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
            {result.label}
          </p>
          {result.items.map((item, i) => (
            <div key={i} className="copilot-result-item">
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{item.text}</span>
              {item.sub && (
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                  {item.sub}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
