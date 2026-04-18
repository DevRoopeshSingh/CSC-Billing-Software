// src/types/index.ts
// @deprecated — Use src/shared/types.ts for Zod-validated schemas and types.
// This file re-exports everything from shared/types for backward compatibility.

export {
  type CenterProfile,
  type Service,
  type Customer,
  type Invoice,
  type InvoiceItem,
  type InvoiceDetail,
  type CreateInvoiceRequest,
  type FaqEntry,
  type ServiceChecklistItem,
  type Lead,
  type MessageTemplate,
  type PaymentMode,
  type InvoiceStatus,
  type LeadStatus,
  type MessageChannel,
} from "@/shared/types";

// ─── Types only defined here (not yet migrated to Zod) ──────────────────────

/** Client-side line item input for invoice creation */
export interface LineItemInput {
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
}

/** Agent conversation log entry */
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
