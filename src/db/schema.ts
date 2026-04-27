// src/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Center Profile ──────────────────────────────────────────────────────────
export const centerProfiles = sqliteTable("center_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  centerName: text("center_name").notNull().default(""),
  address: text("address").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  udyamNumber: text("udyam_number").notNull().default(""),
  logoPath: text("logo_path"),
  upiQrPath: text("upi_qr_path"),
  upiId: text("upi_id"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  invoiceNumber: integer("invoice_number").notNull().default(0),
  theme: text("theme").notNull().default("light"),
  defaultTaxRate: real("default_tax_rate").notNull().default(0),
  defaultPaymentMode: text("default_payment_mode").notNull().default("Cash"),
  lastBackupDate: integer("last_backup_date", { mode: "timestamp" }),
  pinHash: text("pin_hash"),
  operatingHours: text("operating_hours").notNull().default(""),
  centerDescription: text("center_description").notNull().default(""),
  printerInterface: text("printer_interface").notNull().default("tcp://192.168.1.100:9100"),
  printerType: text("printer_type").notNull().default("EPSON"),
  printUpiQr: integer("print_upi_qr", { mode: "boolean" }).notNull().default(false),
});

// ─── Service ─────────────────────────────────────────────────────────────────
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull().default("Other Services"),
  subcategory: text("subcategory").notNull().default(""),
  defaultPrice: real("default_price").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  priceIsStartingFrom: integer("price_is_starting_from", { mode: "boolean" })
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isBookmarked: integer("is_bookmarked", { mode: "boolean" }).notNull().default(false),
  keywords: text("keywords").notNull().default(""),
});

export const servicesRelations = relations(services, ({ many }) => ({
  invoiceItems: many(invoiceItems),
  checklists: many(serviceChecklists),
}));

// ─── Customer ────────────────────────────────────────────────────────────────
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  remarks: text("remarks"),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  tags: text("tags").notNull().default(""),
});

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

// ─── Invoice ─────────────────────────────────────────────────────────────────
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoice_no").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  subtotal: real("subtotal").notNull(),
  taxTotal: real("tax_total").notNull().default(0),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull(),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  status: text("status").notNull().default("PAID"),
  notes: text("notes"),
  customerNotes: text("customer_notes"),
  printedAt: integer("printed_at", { mode: "timestamp" }),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

// ─── Invoice Item ────────────────────────────────────────────────────────────
export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id),
  description: text("description").notNull(),
  qty: integer("qty").notNull(),
  rate: real("rate").notNull(),
  taxRate: real("tax_rate").notNull().default(0),
  lineTotal: real("line_total").notNull(),
});

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
}));

// ─── FAQ / Knowledge Base ────────────────────────────────────────────────────
export const faqEntries = sqliteTable("faq_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  tags: text("tags").notNull().default(""),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Service Document Checklists ─────────────────────────────────────────────
export const serviceChecklists = sqliteTable("service_checklists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  documentName: text("document_name").notNull(),
  isRequired: integer("is_required", { mode: "boolean" })
    .notNull()
    .default(true),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceChecklistsRelations = relations(
  serviceChecklists,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceChecklists.serviceId],
      references: [services.id],
    }),
  })
);

// ─── Lead Capture ────────────────────────────────────────────────────────────
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  serviceInterest: text("service_interest").notNull().default(""),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("NEW"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  convertedCustomerId: integer("converted_customer_id"),
});

// ─── Message Templates ──────────────────────────────────────────────────────
export const messageTemplates = sqliteTable("message_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  body: text("body").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// ─── Agent Interaction Log ──────────────────────────────────────────────────
export const agentLogs = sqliteTable("agent_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentType: text("agent_type").notNull(),
  sessionId: text("session_id").notNull().default(""),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name").notNull().default(""),
  toolInput: text("tool_input").notNull().default(""),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── API Keys ────────────────────────────────────────────────────────────────
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  scope: text("scope").notNull().default("copilot"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});
