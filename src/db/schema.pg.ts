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
  printUpiQr: boolean("print_upi_qr").notNull().default(false),
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
