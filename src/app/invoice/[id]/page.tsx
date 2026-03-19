import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/formatters";
import InvoiceActions from "./InvoiceActions";

async function getInvoice(id: number) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { service: true } },
    },
  });
}

async function getCenter() {
  let profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
  if (!profile) {
    profile = await prisma.centerProfile.create({ data: { id: 1 } });
  }
  return profile;
}

export default async function InvoicePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id: rawId } = await props.params;
  const searchParams = await props.searchParams;
  const id = Number(rawId);
  const template = searchParams.template || "simple";
  const autoPrint = searchParams.print === "true";
  const [invoice, center] = await Promise.all([getInvoice(id), getCenter()]);

  if (!invoice) notFound();

  return (
    <>
      <InvoiceActions 
        invoice={invoice} 
        centerName={center.centerName || "CSC Center"} 
        currentTemplate={template}
      />

      {autoPrint && (
        <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { setTimeout(function() { window.print(); }, 300); }' }} />
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 12mm 18mm 12mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .invoice-wrap { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Invoice document */}
      <div style={{ paddingTop: 56 }}>
        <div className="invoice-wrap" style={{
          maxWidth: 760, margin: "0 auto",
          background: "#fff", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,.1)",
          padding: "32px 36px", fontFamily: "'Segoe UI', sans-serif"
        }}>
          {/* ── Header ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, borderBottom: "2px solid #1a56db", paddingBottom: 20 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {center.logoPath && (
                <img
                  src={center.logoPath}
                  alt="Logo"
                  style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 4 }}
                />
              )}
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e2a45", margin: 0 }}>
                  {center.centerName || "My CSC Center"}
                </h1>
                {center.address && (
                  <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4, whiteSpace: "pre-line", maxWidth: 320 }}>
                    {center.address}
                  </p>
                )}
                <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                  {center.mobile && <span>📞 {center.mobile}</span>}
                  {center.mobile && center.email && <span style={{ margin: "0 8px" }}>·</span>}
                  {center.email && <span>✉ {center.email}</span>}
                </div>
                {center.udyamNumber && (
                  <p style={{ fontSize: 12, marginTop: 4, color: "#6b7280" }}>
                    Udyam: <strong>{center.udyamNumber}</strong>
                  </p>
                )}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280" }}>
                Invoice
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#1a56db", marginTop: 2 }}>
                {invoice.invoiceNo}
              </p>
              <div style={{ marginTop: 8 }}>
                 <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "4px", 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: "#fff",
                    textTransform: "uppercase",
                    backgroundColor: invoice.status === "PAID" ? "#16a34a" : invoice.status === "CANCELLED" ? "#ef4444" : "#f59e0b"
                 }}>
                   {invoice.status}
                 </span>
              </div>
              <p style={{ fontSize: 13, color: "#4b5563", marginTop: 12 }}>
                Date: {formatDate(invoice.createdAt)}
              </p>
              <p style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>
                Mode: {invoice.paymentMode}
              </p>
            </div>
          </div>

          {/* ── Customer ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", marginBottom: 6 }}>
              Bill To
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              {invoice.customer.name}
            </p>
            {invoice.customer.mobile && (
              <p style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>
                Mobile: {invoice.customer.mobile}
              </p>
            )}
          </div>

          {/* ── Line Items ─────────────────────────────────────────────── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr style={{ background: "#1a56db" }}>
                {["#", "Service / Description", "Qty", "Rate (₹)", "Tax %", "Amount (₹)"].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 12px", color: "#fff", fontSize: 12,
                    fontWeight: 700, textAlign: i >= 2 ? "right" : "left",
                    textTransform: "uppercase", letterSpacing: ".04em"
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb", background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 13 }}>{idx + 1}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                    {item.description || item.service.name}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.qty}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {item.rate.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {item.taxRate > 0 ? `${item.taxRate}%` : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                    {item.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals + QR ────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            {/* UPI QR */}
            <div>
              {center.upiQrPath ? (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={center.upiQrPath}
                    alt="UPI QR"
                    style={{ width: 120, height: 120, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 8 }}
                  />
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Scan to Pay (UPI)</p>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Totals */}
            <div style={{ minWidth: 260 }}>
              {[
                { label: "Subtotal", value: formatCurrency(invoice.subtotal) },
                { label: "Tax", value: formatCurrency(invoice.taxTotal) },
                ...(invoice.discount > 0
                  ? [{ label: "Discount", value: `− ${formatCurrency(invoice.discount)}` }]
                  : []),
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb", fontSize: 14, color: "#374151" }}>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#1a56db", borderRadius: 8, marginTop: 10 }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Total</span>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              <p style={{ textAlign: "right", marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Payment Mode: {invoice.paymentMode}
              </p>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || invoice.customerNotes) && (
            <div style={{ display: "flex", gap: "24px", marginTop: 24 }}>
              {invoice.notes && (
                <div style={{ flex: 1, padding: "12px 16px", background: "#f9fafb", borderLeft: "3px solid #1a56db", borderRadius: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Notes</p>
                  <p style={{ fontSize: 14, color: "#374151" }}>{invoice.notes}</p>
                </div>
              )}
              {invoice.customerNotes && (
                <div style={{ flex: 1, padding: "12px 16px", background: "#f9fafb", borderLeft: "3px solid #4b5563", borderRadius: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Customer Remarks</p>
                  <p style={{ fontSize: 14, color: "#374151", fontStyle: "italic" }}>{invoice.customerNotes}</p>
                </div>
              )}
            </div>
          )}

          {template === "detailed" && (
            <div style={{ marginTop: 60, borderTop: "2px dashed #e5e7eb", paddingTop: 30 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ maxWidth: "60%" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#111827" }}>Terms & Conditions</h4>
                  <ul style={{ fontSize: 12, color: "#6b7280", paddingLeft: 16, margin: 0 }}>
                    <li>All services provided are subject to standard verification.</li>
                    <li>Fees once paid are non-refundable.</li>
                    <li>Please bring original documents for any future reference.</li>
                  </ul>
                  
                  {center.address && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Find us at:</p>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(center.centerName + " " + center.address)}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a56db", textDecoration: "none" }}>
                        View on Map 📍
                      </a>
                    </div>
                  )}
                </div>
                
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ borderBottom: "1px solid #4b5563", width: 160, marginBottom: 8 }}></div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Authorized Signature</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{center.centerName}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div style={{ marginTop: 36, paddingTop: 16, borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Thank you for your business! — {center.centerName || "CSC Center"}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              This is a computer-generated invoice.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
