"use client";

import { useRouter } from "next/navigation";

export default function InvoiceActions({
  invoice,
  centerName,
  currentTemplate,
}: {
  invoice: any;
  centerName: string;
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

  const handleWhatsApp = () => {
    let mobile = invoice.customer.mobile;
    if (!mobile) {
      alert("Customer has no mobile number registered.");
      return;
    }
    // Remove formatting and ensure country code
    mobile = mobile.replace(/\D/g, "");
    if (mobile.length === 10) mobile = "91" + mobile;

    const message = `Hello ${invoice.customer.name}, your bill ${invoice.invoiceNo} of Rs.${invoice.total} is ready. Visit ${centerName}. Thank you!`;
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const toggleTemplate = (t: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("template", t);
    // Remove auto-print search param from UI toggle to avoid looping print dialogs
    url.searchParams.delete("print");
    router.push(url.pathname + url.search);
  };

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
      <div style={{ display: "flex", gap: 10 }}>
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

        <button
          onClick={handleWhatsApp}
          style={{
            padding: "7px 16px", background: "#25D366", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}
        >
          💬 WhatsApp
        </button>

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
