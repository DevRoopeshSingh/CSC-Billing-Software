// src/db/schema.pg.ts
// Postgres schema. Phase 3 adds full invoices columns and invoice_items.
// Money columns are numeric(12,2) — postgres-js returns them as strings;
// handlers serialize to JS numbers on read and stringify (.toFixed(2)) on
// write so we never let scientific notation reach the DB.

import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  customType,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Postgres bytea ↔ Node Buffer. Used for branding assets (logo / UPI QR).
// Size capped at 2 MB at the route layer; column itself has no DB-level limit.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const centerProfiles = pgTable("center_profiles", {
  id: serial("id").primaryKey(),
  centerName: text("center_name").notNull().default(""),
  address: text("address").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  udyamNumber: text("udyam_number").notNull().default(""),
  logoKey: text("logo_key"),
  upiQrKey: text("upi_qr_key"),
  upiId: text("upi_id"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  invoiceNumber: integer("invoice_number").notNull().default(0),
  theme: text("theme").notNull().default("light"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  defaultPaymentMode: text("default_payment_mode").notNull().default("Cash"),
  lastBackupDate: timestamp("last_backup_date", { withTimezone: true }),
  pinHash: text("pin_hash"),
  operatingHours: text("operating_hours").notNull().default(""),
  centerDescription: text("center_description").notNull().default(""),
  printerInterface: text("printer_interface").notNull().default("tcp://192.168.1.100:9100"),
  printerType: text("printer_type").notNull().default("EPSON"),
  printUpiQr: boolean("print_upi_qr").notNull().default(false),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsappApiToken: text("whatsapp_api_token"),
  whatsappPhoneId: text("whatsapp_phone_id"),
  cloudBackupEnabled: boolean("cloud_backup_enabled").notNull().default(false),
  s3Endpoint: text("s3_endpoint"),
  s3AccessKey: text("s3_access_key"),
  s3SecretKey: text("s3_secret_key"),
  s3Bucket: text("s3_bucket"),
  backupEncryptionKey: text("backup_encryption_key"),
  cronSecret: text("cron_secret"),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  smsProvider: text("sms_provider").notNull().default("fast2sms"),
  smsApiToken: text("sms_api_token"),
  smsSenderId: text("sms_sender_id"),
  smsTemplateId: text("sms_template_id"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Other Services"),
  subcategory: text("subcategory").notNull().default(""),
  defaultPrice: numeric("default_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  priceIsStartingFrom: boolean("price_is_starting_from")
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isBookmarked: boolean("is_bookmarked").notNull().default(false),
  keywords: text("keywords").notNull().default(""),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Branding assets — single row per kind ("logo" | "upiQr"). Bytes live in
// Postgres so a browser-only deploy needs no filesystem; the GET endpoint
// streams the raw bytes back with the stored Content-Type.
export const brandingAssets = pgTable("branding_assets", {
  kind: text("kind").primaryKey(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serviceChecklists = pgTable("service_checklists", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  documentName: text("document_name").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  remarks: text("remarks"),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  tags: text("tags").notNull().default(""),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(true),
  smsOptIn: boolean("sms_opt_in").notNull().default(true),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  aadhaarNumber: text("aadhaar_number").notNull().default(""),
  panNumber: text("pan_number").notNull().default(""),
  kycVerified: boolean("kyc_verified").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Invoice table — full Phase 3 shape. Status (PAID|PENDING|CANCELLED) stays
// as a text column; the enum is enforced in zod, not as a DB check constraint,
// to keep migrations cheap. Money columns are numeric(12,2).
export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNo: text("invoice_no").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxTotal: numeric("tax_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    advancePayment: numeric("advance_payment", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    balanceAmount: numeric("balance_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    paymentMode: text("payment_mode").notNull().default("Cash"),
    status: text("status").notNull().default("PAID"),
    notes: text("notes"),
    customerNotes: text("customer_notes"),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => users.id),
    updatedBy: integer("updated_by").references(() => users.id),
  },
  (t) => ({
    createdAtIdx: index("idx_invoices_created_at").on(t.createdAt),
    customerIdx: index("idx_invoices_customer").on(t.customerId),
  })
);

// Invoice line items. Cascade-deletes with the parent invoice. Service FK
// is RESTRICT so a service can't be deleted out from under existing invoices;
// the services.bulkDelete handler filters in-use ids explicitly.
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    qty: integer("qty").notNull(),
    rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
    govCharge: numeric("gov_charge", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => ({
    invoiceIdx: index("idx_invoice_items_invoice").on(t.invoiceId),
    serviceIdx: index("idx_invoice_items_service").on(t.serviceId),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  invoicesCreated: many(invoices, { relationName: "invoiceCreatedBy" }),
  invoicesUpdated: many(invoices, { relationName: "invoiceUpdatedBy" }),
  designs: many(designs),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
  creator: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
    relationName: "invoiceCreatedBy",
  }),
  updater: one(users, {
    fields: [invoices.updatedBy],
    references: [users.id],
    relationName: "invoiceUpdatedBy",
  }),
}));

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

export const servicesRelations = relations(services, ({ many }) => ({
  checklists: many(serviceChecklists),
  invoiceItems: many(invoiceItems),
}));

export const serviceChecklistsRelations = relations(
  serviceChecklists,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceChecklists.serviceId],
      references: [services.id],
    }),
  })
);

export const designs = pgTable("designs", {
  id: text("id").primaryKey(), // e.g., 'design_123'
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  // JSON representation of the Fabric canvas state (AvnacCanvasState)
  canvasState: customType<{ data: any; default: false }>({ dataType() { return "jsonb" } })("canvas_state").notNull(),
  thumbnail: text("thumbnail"), // base64 string
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const designsRelations = relations(designs, ({ one }) => ({
  user: one(users, {
    fields: [designs.userId],
    references: [users.id],
  }),
}));

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull().default("Other"),
  description: text("description").notNull().default(""),
  expenseDate: timestamp("expense_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shiftHandovers = pgTable("shift_handovers", {
  id: serial("id").primaryKey(),
  shiftDate: timestamp("shift_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  startingCash: numeric("starting_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  expectedEndingCash: numeric("expected_ending_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  actualEndingCash: numeric("actual_ending_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  discrepancy: numeric("discrepancy", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  creator: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));

export const shiftHandoversRelations = relations(shiftHandovers, ({ one }) => ({
  creator: one(users, {
    fields: [shiftHandovers.createdBy],
    references: [users.id],
  }),
}));

// Phase 4: Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Phase 4: Customer Loyalty Transactions
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  points: integer("points").notNull(),
  type: text("type").notNull(), // 'EARNED', 'REDEEMED', 'MANUAL_ADJUSTMENT'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  customer: one(customers, {
    fields: [loyaltyTransactions.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [loyaltyTransactions.invoiceId],
    references: [invoices.id],
  }),
}));

// Phase 4: Customer Documents
export const customerDocuments = pgTable("customer_documents", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customerDocumentsRelations = relations(customerDocuments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerDocuments.customerId],
    references: [customers.id],
  }),
}));

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  serviceInterest: text("service_interest").notNull().default(""),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("NEW"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  convertedCustomerId: integer("converted_customer_id"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const faqEntries = pgTable("faq_entries", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  tags: text("tags").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
  referenceId: text("reference_id"),
  createdBy: integer("created_by").references(() => users.id),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  creator: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));

export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  sessionId: text("session_id").notNull().default(""),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name").notNull().default(""),
  toolInput: text("tool_input").notNull().default(""),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  scope: text("scope").notNull().default("copilot"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});



