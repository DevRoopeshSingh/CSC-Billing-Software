// src/shared/types.ts
import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const PaymentMode = z.enum(["Cash", "UPI", "Card", "Other"]);
export type PaymentMode = z.infer<typeof PaymentMode>;

export const InvoiceStatus = z.enum(["PAID", "PENDING", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const LeadStatus = z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const MessageChannel = z.enum(["whatsapp", "sms", "both"]);
export type MessageChannel = z.infer<typeof MessageChannel>;

// ─── Center Profile ──────────────────────────────────────────────────────────
export const centerProfileSchema = z.object({
  id: z.number().int().positive().optional(),
  centerName: z.string().default(""),
  address: z.string().default(""),
  mobile: z.string().default(""),
  email: z.string().email().or(z.literal("")).default(""),
  udyamNumber: z.string().default(""),
  logoPath: z.string().nullable().default(null),
  upiQrPath: z.string().nullable().default(null),
  upiId: z.string().nullable().default(null),
  invoicePrefix: z.string().default("INV-"),
  invoiceNumber: z.number().int().nonnegative().default(0),
  theme: z.string().default("light"),
  defaultTaxRate: z.number().nonnegative().default(0),
  defaultPaymentMode: PaymentMode.default("Cash"),
  lastBackupDate: z.coerce.date().nullable().default(null),
  pinHash: z.string().nullable().default(null),
  operatingHours: z.string().default(""),
  centerDescription: z.string().default(""),
});

export type CenterProfile = z.infer<typeof centerProfileSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────
export const serviceSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Service name is required"),
  category: z.string().default("Other"),
  defaultPrice: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().max(100).default(0),
  isActive: z.boolean().default(true),
  isBookmarked: z.boolean().default(false),
  keywords: z.string().default(""),
});

export type Service = z.infer<typeof serviceSchema>;

// ─── Customer ────────────────────────────────────────────────────────────────
export const customerSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Customer name is required"),
  mobile: z.string().default(""),
  remarks: z.string().nullable().default(null),
  email: z.string().email().or(z.literal("")).default(""),
  address: z.string().default(""),
  tags: z.string().default(""),
});

export type Customer = z.infer<typeof customerSchema>;

// ─── Invoice Item ────────────────────────────────────────────────────────────
export const invoiceItemSchema = z.object({
  id: z.number().int().positive().optional(),
  invoiceId: z.number().int().positive().optional(),
  serviceId: z.number().int().positive(),
  description: z.string().min(1),
  qty: z.number().int().positive(),
  rate: z.number().nonnegative(),
  taxRate: z.number().nonnegative().max(100).default(0),
  lineTotal: z.number().nonnegative(),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// ─── Invoice ─────────────────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  id: z.number().int().positive().optional(),
  invoiceNo: z.string(),
  createdAt: z.coerce.date().optional(),
  customerId: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  paymentMode: PaymentMode.default("Cash"),
  status: InvoiceStatus.default("PAID"),
  notes: z.string().nullable().default(null),
  customerNotes: z.string().nullable().default(null),
  printedAt: z.coerce.date().nullable().default(null),
  items: z.array(invoiceItemSchema).optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

// ─── Invoice with relations (read model) ─────────────────────────────────────
export type InvoiceDetail = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { service: Service })[];
};

// ─── Create Invoice Request ──────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  customerId: z.number().int().positive().optional(),
  newCustomer: z
    .object({
      name: z.string().min(1),
      mobile: z.string(),
    })
    .optional(),
  items: z.array(
    z.object({
      serviceId: z.number().int().positive(),
      description: z.string().min(1),
      qty: z.number().int().positive(),
      rate: z.number().nonnegative(),
      taxRate: z.number().nonnegative().max(100).default(0),
    })
  ),
  discount: z.number().nonnegative().default(0),
  paymentMode: PaymentMode.optional(),
  status: InvoiceStatus.optional(),
  notes: z.string().optional(),
  customerNotes: z.string().optional(),
});

export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;

// ─── FAQ Entry ───────────────────────────────────────────────────────────────
export const faqEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().default("General"),
  tags: z.string().default(""),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type FaqEntry = z.infer<typeof faqEntrySchema>;

// ─── Service Checklist ───────────────────────────────────────────────────────
export const serviceChecklistSchema = z.object({
  id: z.number().int().positive().optional(),
  serviceId: z.number().int().positive(),
  documentName: z.string().min(1),
  isRequired: z.boolean().default(true),
  notes: z.string().default(""),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type ServiceChecklistItem = z.infer<typeof serviceChecklistSchema>;

// ─── Lead ────────────────────────────────────────────────────────────────────
export const leadSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
  mobile: z.string().default(""),
  email: z.string().email().or(z.literal("")).default(""),
  serviceInterest: z.string().default(""),
  source: z.string().default("manual"),
  status: LeadStatus.default("NEW"),
  notes: z.string().nullable().default(null),
  createdAt: z.coerce.date().optional(),
  convertedCustomerId: z.number().int().positive().nullable().default(null),
});

export type Lead = z.infer<typeof leadSchema>;

// ─── Message Template ────────────────────────────────────────────────────────
export const messageTemplateSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
  channel: MessageChannel.default("whatsapp"),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
