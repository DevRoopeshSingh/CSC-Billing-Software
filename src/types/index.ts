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
  upiId: string | null;
  invoicePrefix: string;
  invoiceNumber: number;
  theme: string;
  defaultTaxRate: number;
  defaultPaymentMode: string;
  lastBackupDate: string | Date | null;
  hasPin?: boolean;
  operatingHours: Record<string, string> | null;
  centerDescription: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export interface Service {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
  isActive: boolean;
  keywords: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  mobile: string;
  remarks: string | null;
  email: string;
  address: string;
  tags: string;
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
  printedAt: string | Date | null;
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

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT-READY TYPES (Phase 1)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FAQ Entry ────────────────────────────────────────────────────────────────
export interface FaqEntry {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Service Checklist Item ──────────────────────────────────────────────────
export interface ServiceChecklistItem {
  id: number;
  serviceId: number;
  documentName: string;
  isRequired: boolean;
  notes: string;
  sortOrder: number;
}

// ─── Lead ────────────────────────────────────────────────────────────────────
export interface Lead {
  id: number;
  name: string;
  mobile: string;
  email: string;
  serviceInterest: string;
  source: string;
  status: string; // "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED"
  notes: string | null;
  createdAt: string;
  convertedCustomerId: number | null;
}

// ─── Message Template ────────────────────────────────────────────────────────
export interface MessageTemplate {
  id: number;
  name: string;
  channel: string; // "whatsapp" | "sms" | "both"
  body: string;
  isActive: boolean;
}

// ─── Agent Log Entry ─────────────────────────────────────────────────────────
export interface AgentLogEntry {
  id: number;
  agentType: string;
  sessionId: string;
  role: string;
  content: string;
  toolName: string;
  toolInput: string;
  durationMs: number;
  createdAt: string;
}

