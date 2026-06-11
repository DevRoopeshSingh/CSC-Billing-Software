"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { InvoiceDetail, InvoiceItem, Service } from "@/shared/types";
import { Loader2 } from "lucide-react";

type LineItemWithService = InvoiceItem & { service?: Service };

export default function PrintReceiptPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [center, setCenter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = Number(params?.id);
      if (!id) return;
      try {
        const [inv, prof] = await Promise.all([
          api.get<InvoiceDetail>(API.INVOICE(id)),
          api.get<any>(API.CENTER).catch(() => null),
        ]);
        setInvoice(inv);
        setCenter(prof);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        // Delay print slightly to ensure rendering
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
    load();
  }, [params]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-8 text-center">Invoice not found</div>;
  }

  const items = (invoice.items ?? []) as LineItemWithService[];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 80mm !important;
            padding: 5mm !important;
            margin: 0 auto;
            color: #000;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
          }
        }
        
        /* Screen preview styling */
        @media screen {
          body {
            background: #f3f4f6;
          }
          .print-container {
            width: 80mm;
            min-height: 100mm;
            margin: 2rem auto;
            padding: 5mm;
            background: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            color: #000;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
          }
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-lg { font-size: 16px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .py-1 { padding-top: 4px; padding-bottom: 4px; }
        .border-t { border-top: 1px dashed #000; }
        .border-b { border-bottom: 1px dashed #000; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .w-full { width: 100%; }
      `}} />

      <div className="print-container">
        <div className="text-center mb-4">
          <div className="font-bold text-lg">{center?.centerName || "CSC Center"}</div>
          {center?.address && <div>{center.address}</div>}
          {center?.mobile && <div>Phone: {center.mobile}</div>}
        </div>

        <div className="mb-2">
          <div>Receipt No: {invoice.invoiceNo}</div>
          <div>Date: {invoice.createdAt ? formatDate(invoice.createdAt) : ""}</div>
          {invoice.customer && (
            <div>Customer: {invoice.customer.name}</div>
          )}
        </div>

        <table className="w-full mb-4" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-t border-b">
              <th className="py-1 text-left" style={{ width: "50%" }}>Item</th>
              <th className="py-1 text-center" style={{ width: "15%" }}>Qty</th>
              <th className="py-1 text-right" style={{ width: "35%" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1">{item.description}</td>
                <td className="py-1 text-center">{item.qty}</td>
                <td className="py-1 text-right">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t pt-2 mb-4">
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>- {formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.advancePayment > 0 && (
            <>
              <div className="flex justify-between mt-1">
                <span>Paid ({invoice.paymentMode}):</span>
                <span>{formatCurrency(invoice.advancePayment)}</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span>Balance:</span>
                <span>{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-4 text-xs">
          Thank you for visiting!<br/>
          Powered by CSC Billing
        </div>
      </div>
      
      <div className="no-print text-center mt-4">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Print Again
        </button>
        <br/>
        <button 
          onClick={() => window.close()}
          className="text-gray-500 hover:text-gray-800 mt-2 text-sm"
        >
          Close Window
        </button>
      </div>
    </>
  );
}
