'use client';
import { useState } from 'react';

interface PrintButtonProps {
  invoice: {
    id: number;
    invoiceNo: string;
    createdAt: string;
    subtotal: number;
    taxTotal: number;
    discount: number;
    total: number;
    paymentMode: string;
    notes: string | null;
    customer?: { name: string; mobile: string };
    items: Array<{
      description: string;
      qty: number;
      rate: number;
      taxRate: number;
      lineTotal: number;
    }>;
  };
  centerName?: string;
  centerAddress?: string;
  centerPhone?: string;
}

export default function PrintButton({ invoice, centerName, centerAddress, centerPhone }: PrintButtonProps) {
  const [status, setStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePrint = async () => {
    // Check if we're in Electron with the printer API available
    if (typeof window === 'undefined' || !(window as any).api?.printReceipt) {
      // Fallback: browser print
      window.print();
      return;
    }

    setStatus('printing');
    setErrorMsg('');
    try {
      const payload = {
        ...invoice,
        centerName: centerName || 'CSC Center',
        centerAddress: centerAddress || '',
        centerPhone: centerPhone || '',
        customerName: invoice.customer?.name || 'Walk-in',
      };
      const result = await (window as any).api.printReceipt(payload);
      if (result?.success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setErrorMsg(result?.error || 'Print failed');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Print failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const label = {
    idle: '🖨️ Thermal Print',
    printing: 'Printing…',
    success: '✓ Printed!',
    error: '✕ Failed',
  }[status];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handlePrint}
        disabled={status === 'printing'}
        className={`btn ${
          status === 'success'
            ? 'btn-success'
            : status === 'error'
              ? 'btn-danger'
              : 'btn-ghost'
        }`}
        style={{ minWidth: 140 }}
        title="Print receipt on thermal printer"
      >
        {label}
      </button>
      {status === 'error' && errorMsg && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: '6px 10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            fontSize: 12,
            color: '#991b1b',
            whiteSpace: 'nowrap',
            zIndex: 50,
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
