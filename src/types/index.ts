// ─── Center Profile ───────────────────────────────────────────────────────────
export interface CenterProfile {
  id: number;
  centerName: string;
  address: string;
  mobile: string;
  email: string;
  udyamNumber: string | null;
  logoPath: string | null;
  upiQrPath: string | null;
  invoicePrefix: string;
  invoiceNumber: number;
  theme: string;
  defaultTaxRate: number;
  defaultPaymentMode: string;
  lastBackupDate: string | Date | null;
  hasPin?: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export interface Service {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
  isActive: boolean;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  mobile: string;
  remarks: string | null;
}

// ─── Invoice (summary) ────────────────────────────────────────────────────────
export interface Invoice {
  id: number;
  invoiceNo: string;
  createdAt: string;
  customerId: number;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paymentMode: string;
  notes: string | null;
  customerNotes: string | null;
  status: string; // "PAID" | "PENDING" | "CANCELLED"
  items: InvoiceItem[];
  customer?: Customer;
}

// ─── Invoice Item ─────────────────────────────────────────────────────────────
export interface InvoiceItem {
  id: number;
  invoiceId: number;
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
  lineTotal: number;
}

// ─── Invoice Detail (with relations) ─────────────────────────────────────────
export interface InvoiceDetail extends Invoice {
  customer: Customer;
  items: (InvoiceItem & { service: Service })[];
}

// ─── Bill Line Item (client-side input) ───────────────────────────────────────
export interface LineItemInput {
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
}

// ─── Create Invoice Request ───────────────────────────────────────────────────
export interface CreateInvoiceRequest {
  customerId?: number;
  newCustomer?: { name: string; mobile: string };
  items: LineItemInput[];
  discount: number;
  paymentMode?: string;
  status?: string;
  notes?: string;
  customerNotes?: string;
}
