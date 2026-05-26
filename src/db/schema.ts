import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"), // admin, staff, viewer
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  invoicesCreated: many(invoices, { relationName: "invoiceCreatedBy" }),
  invoicesUpdated: many(invoices, { relationName: "invoiceUpdatedBy" }),
}));

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
  whatsappEnabled: integer("whatsapp_enabled", { mode: "boolean" }).notNull().default(false),
  whatsappApiToken: text("whatsapp_api_token"),
  whatsappPhoneId: text("whatsapp_phone_id"),
  cloudBackupEnabled: integer("cloud_backup_enabled", { mode: "boolean" }).notNull().default(false),
  s3Endpoint: text("s3_endpoint"),
  s3AccessKey: text("s3_access_key"),
  s3SecretKey: text("s3_secret_key"),
  s3Bucket: text("s3_bucket"),
  backupEncryptionKey: text("backup_encryption_key"),
  cronSecret: text("cron_secret"),
  smsEnabled: integer("sms_enabled", { mode: "boolean" }).notNull().default(false),
  smsProvider: text("sms_provider").notNull().default("fast2sms"),
  smsApiToken: text("sms_api_token"),
  smsSenderId: text("sms_sender_id"),
  smsTemplateId: text("sms_template_id"),
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
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
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
  whatsappOptIn: integer("whatsapp_opt_in", { mode: "boolean" })
    .notNull()
    .default(true),
  smsOptIn: integer("sms_opt_in", { mode: "boolean" })
    .notNull()
    .default(true),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  aadhaarNumber: text("aadhaar_number").notNull().default(""),
  panNumber: text("pan_number").notNull().default(""),
  kycVerified: integer("kyc_verified", { mode: "boolean" }).notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
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
  advancePayment: real("advance_payment").notNull().default(0),
  balanceAmount: real("balance_amount").notNull().default(0),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  status: text("status").notNull().default("PAID"),
  notes: text("notes"),
  customerNotes: text("customer_notes"),
  printedAt: integer("printed_at", { mode: "timestamp" }),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

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
  govCharge: real("gov_charge").notNull().default(0),
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
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
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
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
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

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  expenseDate: integer("expense_date", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// ─── Shift Handovers ─────────────────────────────────────────────────────────
export const shiftHandovers = sqliteTable("shift_handovers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shiftDate: integer("shift_date", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  startingCash: text("starting_cash").notNull(),
  expectedEndingCash: text("expected_ending_cash").notNull(),
  actualEndingCash: text("actual_ending_cash").notNull(),
  discrepancy: text("discrepancy").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// ─── Payments ────────────────────────────────────────────────────────────────
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: text("amount").notNull(),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  paymentDate: integer("payment_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── Loyalty Transactions ────────────────────────────────────────────────────
export const loyaltyTransactions = sqliteTable("loyalty_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  points: integer("points").notNull(),
  type: text("type").notNull(), // 'EARNED', 'REDEEMED', 'MANUAL_ADJUSTMENT'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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

// ─── Customer Documents ────────────────────────────────────────────────────────
export const customerDocuments = sqliteTable("customer_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const customerDocumentsRelations = relations(customerDocuments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerDocuments.customerId],
    references: [customers.id],
  }),
}));

// ─── Studio Designs ────────────────────────────────────────────────────────
export const designs = sqliteTable("designs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  canvasState: text("canvas_state").notNull(),
  thumbnail: text("thumbnail"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const designsRelations = relations(designs, ({ one }) => ({
  user: one(users, {
    fields: [designs.userId],
    references: [users.id],
  }),
}));

