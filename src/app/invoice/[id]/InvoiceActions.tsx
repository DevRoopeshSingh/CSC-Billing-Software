"use client";

import { useRouter } from "next/navigation";
import PrintButton from "@/components/print/PrintButton";
import WhatsAppShare from "@/components/invoice/WhatsAppShare";

export default function InvoiceActions({
  invoice,
  centerName,
  centerAddress,
  centerPhone,
  upiId,
  currentTemplate,
}: {
  invoice: any;
  centerName: string;
  centerAddress?: string;
  centerPhone?: string;
  upiId?: string;
  currentTemplate: string;
}) {
  const router = useRouter();

  const handleStatusUpdate = async (status: string) => {
    if (status === "CANCELLED" && !confirm("Are you sure you want to cancel this invoice?")) {
      return;
    }
    await fetch(`/api/invoices/${invoice.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  const toggleTemplate = (t: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("template", t);
    url.searchParams.delete("print");
    router.push(url.pathname + url.search);
  };

  // Build UPI link if center has UPI ID configured
  let upiLink: string | undefined;
  if (upiId && invoice.total > 0) {
    const tn = encodeURIComponent(`Invoice ${invoice.invoiceNo}`);
    const pn = encodeURIComponent(centerName);
    upiLink = `upi://pay?pa=${upiId}&pn=${pn}&am=${invoice.total.toFixed(2)}&tn=${tn}&cu=INR`;
  }

  return (
    <div className="no-print" style={{
      position: "fixed", top: 0, left: 0, right: 0,
      background: "#1e2a45", padding: "10px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      zIndex: 100
    }}>
      <a href="/" style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 14 }}>
        ← Back to Dashboard
      </a>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {invoice.status === "PENDING" && (
          <a
            href={`/invoice/${invoice.id}/edit`}
            style={{
              padding: "7px 16px", background: "#f59e0b", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none"
            }}
          >
            ✏️ Edit Bill
          </a>
        )}

        {invoice.status === "PENDING" && (
          <button
            onClick={() => handleStatusUpdate("PAID")}
            style={{
              padding: "7px 16px", background: "#16a34a", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            ✓ Mark Paid
          </button>
        )}

        {invoice.status !== "CANCELLED" && (
          <button
            onClick={() => handleStatusUpdate("CANCELLED")}
            style={{
              padding: "7px 16px", background: "transparent", color: "#fca5a5", border: "1px solid #fca5a5",
              borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            ✕ Cancel Bill
          </button>
        )}

        <WhatsAppShare
          invoice={invoice}
          centerName={centerName}
          upiLink={upiLink}
        />

        {/* Thermal Print */}
        <PrintButton
          invoice={invoice}
          centerName={centerName}
          centerAddress={centerAddress}
          centerPhone={centerPhone}
        />

        <a href="/billing/new" style={{
          padding: "7px 16px", background: "#3b82f6", color: "#fff",
          borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center"
        }}>
          + New Bill
        </a>

        <div style={{ borderLeft: "1px solid rgba(255,255,255,.2)", paddingLeft: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <select 
            value={currentTemplate} 
            onChange={(e) => toggleTemplate(e.target.value)}
            style={{ 
              padding: "6px 12px", borderRadius: 6, background: "#fff", color: "#111827", 
              border: "none", fontSize: 13, fontWeight: 600 
            }}
          >
            <option value="simple">Simple Template</option>
            <option value="detailed">Detailed Template</option>
          </select>

          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            download={`${invoice.invoiceNo}.pdf`}
            style={{
              padding: "7px 16px", background: "#ef4444", color: "#fff", textDecoration: "none",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            📄 PDF
          </a>

          <button
            onClick={() => window.print()}
            style={{
              padding: "7px 16px", background: "#16a34a", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            🖨 Print
          </button>
        </div>
      </div>
    </div>
  );
}
