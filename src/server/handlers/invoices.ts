// src/server/handlers/invoices.ts
// Pure invoice handlers — direct port of the INVOICES_* safeHandle blocks
// in src/main/index.ts. Money columns come back from postgres-js as strings;
// serialize* coerces to numbers so the wire format matches the existing
// invoiceSchema/invoiceItemSchema in src/shared/types.ts. Totals are always
// recomputed server-side from qty/rate/taxRate — never trusted from the
// client.

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import {
  createInvoiceSchema,
  bulkMarkPaidSchema,
  type BulkMarkPaidResult,
} from "@/shared/types";

type InvoiceRow = typeof schema.invoices.$inferSelect;
type InvoiceItemRow = typeof schema.invoiceItems.$inferSelect;
type CustomerRow = typeof schema.customers.$inferSelect;
type ServiceRow = typeof schema.services.$inferSelect;

export interface InvoiceShape {
  id: number;
  invoiceNo: string;
  createdAt: Date;
  customerId: number;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paymentMode: string;
  status: string;
  notes: string | null;
  customerNotes: string | null;
  printedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface InvoiceItemShape {
  id: number;
  invoiceId: number;
  serviceId: number;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
  lineTotal: number;
}

export interface ServiceShape {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  defaultPrice: number;
  taxRate: number;
  priceIsStartingFrom: boolean;
  sortOrder: number;
  notes: string;
  isActive: boolean;
  isBookmarked: boolean;
  keywords: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export type InvoiceDetailShape = InvoiceShape & {
  customer: CustomerRow | null;
  items: (InvoiceItemShape & { service?: ServiceShape })[];
};

function serializeInvoice(row: InvoiceRow): InvoiceShape {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.taxTotal),
    discount: Number(row.discount),
    total: Number(row.total),
  };
}

function serializeItem(row: InvoiceItemRow): InvoiceItemShape {
  return {
    ...row,
    rate: Number(row.rate),
    taxRate: Number(row.taxRate),
    lineTotal: Number(row.lineTotal),
  };
}

function serializeService(row: ServiceRow): ServiceShape {
  return {
    ...row,
    defaultPrice: Number(row.defaultPrice ?? 0),
    taxRate: Number(row.taxRate ?? 0),
  };
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listInvoices(): Promise<InvoiceDetailShape[]> {
  const db = getDb();
  const rows = await db.query.invoices.findMany({
    with: { customer: true, items: true },
    orderBy: [desc(schema.invoices.createdAt)],
  });
  return rows.map((r) => ({
    ...serializeInvoice(r),
    customer: r.customer ?? null,
    items: r.items.map(serializeItem),
  }));
}

export async function getInvoice(
  id: number
): Promise<InvoiceDetailShape | null> {
  const db = getDb();
  const row = await db.query.invoices.findFirst({
    where: eq(schema.invoices.id, id),
    with: {
      customer: true,
      items: { with: { service: true } },
    },
  });
  if (!row) return null;
  return {
    ...serializeInvoice(row),
    customer: row.customer ?? null,
    items: row.items.map((it) => ({
      ...serializeItem(it),
      service: it.service ? serializeService(it.service) : undefined,
    })),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeTotals(
  items: { qty: number; rate: number; taxRate: number }[],
  discount: number
) {
  const lines = items.map((it) => {
    const base = it.qty * it.rate;
    const tax = +(base * (it.taxRate / 100)).toFixed(2);
    return {
      ...it,
      lineTax: tax,
      lineTotal: +(base + tax).toFixed(2),
    };
  });
  const subtotal = +lines.reduce((s, l) => s + l.qty * l.rate, 0).toFixed(2);
  const taxTotal = +lines.reduce((s, l) => s + l.lineTax, 0).toFixed(2);
  const total = +(subtotal + taxTotal - discount).toFixed(2);
  return { lines, subtotal, taxTotal, total };
}

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ── Writes ──────────────────────────────────────────────────────────────────

export const createInvoiceInputSchema = createInvoiceSchema;
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export async function createInvoice(
  input: CreateInvoiceInput,
  userId: number
): Promise<{ id: number; invoiceNo: string }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // 1. Resolve customer (existing or create new).
    let customerId = input.customerId;
    if (!customerId && input.newCustomer) {
      const [created] = await tx
        .insert(schema.customers)
        .values({
          name: input.newCustomer.name,
          mobile: input.newCustomer.mobile,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      customerId = created.id;
    }
    if (!customerId) {
      throw new Error("customerId or newCustomer required");
    }

    // 2. Lock the center profile row to serialize the invoice-number bump
    //    across concurrent transactions. SELECT ... FOR UPDATE makes any
    //    parallel invoice-create wait here until this txn commits, so two
    //    concurrent creates can't collide on the same sequence number.
    const [profile] = await tx
      .select({
        invoicePrefix: schema.centerProfiles.invoicePrefix,
        invoiceNumber: schema.centerProfiles.invoiceNumber,
      })
      .from(schema.centerProfiles)
      .where(eq(schema.centerProfiles.id, 1))
      .for("update")
      .limit(1);
    const prefix = profile?.invoicePrefix ?? "INV-";
    const seq = (profile?.invoiceNumber ?? 0) + 1;
    const invoiceNo = `${prefix}${yyyymmdd(new Date())}-${String(seq).padStart(
      3,
      "0"
    )}`;

    // 3. Compute totals server-side. Anything the client sent is ignored.
    const discount = input.discount ?? 0;
    const { lines, subtotal, taxTotal, total } = computeTotals(
      input.items.map((it) => ({
        qty: it.qty,
        rate: it.rate,
        taxRate: it.taxRate ?? 0,
      })),
      discount
    );

    // 4. Insert the invoice. Numeric columns are stringified to keep
    //    postgres-js from routing a JS Number through scientific notation.
    const [invoice] = await tx
      .insert(schema.invoices)
      .values({
        invoiceNo,
        customerId,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        paymentMode: input.paymentMode ?? "Cash",
        status: input.status ?? "PAID",
        notes: input.notes ?? null,
        customerNotes: input.customerNotes ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // 5. Insert line items (bulk).
    if (lines.length > 0) {
      await tx.insert(schema.invoiceItems).values(
        lines.map((l, idx) => ({
          invoiceId: invoice.id,
          serviceId: input.items[idx].serviceId,
          description: input.items[idx].description,
          qty: l.qty,
          rate: l.rate.toFixed(2),
          taxRate: l.taxRate.toFixed(2),
          lineTotal: l.lineTotal.toFixed(2),
        }))
      );
    }

    // 6. Persist the new counter.
    await tx
      .update(schema.centerProfiles)
      .set({ invoiceNumber: seq })
      .where(eq(schema.centerProfiles.id, 1));

    return { id: invoice.id, invoiceNo: invoice.invoiceNo };
  });
}

export const updateInvoiceInputSchema = createInvoiceSchema;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

export async function updateInvoice(
  id: number,
  input: UpdateInvoiceInput,
  userId: number
): Promise<{ id: number; invoiceNo: string }> {
  if (input.status && input.status !== "PAID" && input.status !== "PENDING") {
    throw new Error(
      "Edit can only save as PAID or PENDING. Use /cancel for CANCELLED."
    );
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id))
      .limit(1);
    if (!existing) throw new Error("Invoice not found");
    if (existing.status !== "PENDING") {
      throw new Error("Only PENDING invoices can be edited");
    }

    let customerId = input.customerId;
    if (!customerId && input.newCustomer) {
      const [created] = await tx
        .insert(schema.customers)
        .values({
          name: input.newCustomer.name,
          mobile: input.newCustomer.mobile,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      customerId = created.id;
    }
    if (!customerId) {
      throw new Error("customerId or newCustomer required");
    }

    const discount = input.discount ?? 0;
    const { lines, subtotal, taxTotal, total } = computeTotals(
      input.items.map((it) => ({
        qty: it.qty,
        rate: it.rate,
        taxRate: it.taxRate ?? 0,
      })),
      discount
    );

    await tx
      .update(schema.invoices)
      .set({
        customerId,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        paymentMode: input.paymentMode ?? "Cash",
        status: input.status ?? "PENDING",
        notes: input.notes ?? null,
        customerNotes: input.customerNotes ?? null,
        // Edits invalidate any previously-printed copy; the user must
        // re-print or re-export the PDF to reflect the new content.
        printedAt: null,
        updatedBy: userId,
      })
      .where(eq(schema.invoices.id, id));

    await tx
      .delete(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, id));

    if (lines.length > 0) {
      await tx.insert(schema.invoiceItems).values(
        lines.map((l, idx) => ({
          invoiceId: id,
          serviceId: input.items[idx].serviceId,
          description: input.items[idx].description,
          qty: l.qty,
          rate: l.rate.toFixed(2),
          taxRate: l.taxRate.toFixed(2),
          lineTotal: l.lineTotal.toFixed(2),
        }))
      );
    }

    return { id, invoiceNo: existing.invoiceNo };
  });
}

// PAID|PENDING only. Cancellation lives on its own route so admin+PIN is
// enforced unconditionally at the auth layer, not via a branch inside this
// handler.
export const setStatusInputSchema = z.object({
  status: z.enum(["PAID", "PENDING"]),
});
export type SetStatusInput = z.infer<typeof setStatusInputSchema>;

export async function setInvoiceStatus(
  id: number,
  input: SetStatusInput,
  userId: number
): Promise<InvoiceShape | null> {
  const db = getDb();
  const [row] = await db
    .update(schema.invoices)
    .set({ status: input.status, updatedBy: userId })
    .where(eq(schema.invoices.id, id))
    .returning();
  return row ? serializeInvoice(row) : null;
}

export async function cancelInvoice(
  id: number,
  userId: number
): Promise<InvoiceShape | null> {
  const db = getDb();
  const [row] = await db
    .update(schema.invoices)
    .set({ status: "CANCELLED", updatedBy: userId })
    .where(eq(schema.invoices.id, id))
    .returning();
  return row ? serializeInvoice(row) : null;
}

export async function deleteInvoice(id: number): Promise<{ success: true }> {
  const db = getDb();
  // invoice_items.invoice_id has ON DELETE CASCADE — items vanish with the
  // parent in a single DELETE.
  await db.delete(schema.invoices).where(eq(schema.invoices.id, id));
  return { success: true };
}

export const bulkMarkPaidInputSchema = bulkMarkPaidSchema;
export type BulkMarkPaidInput = z.infer<typeof bulkMarkPaidInputSchema>;

// Single UPDATE … WHERE id IN (…) AND status='PENDING'. PAID/CANCELLED rows
// are silently skipped, matching the IPC version's behavior.
export async function bulkMarkPaid(
  input: BulkMarkPaidInput,
  userId: number
): Promise<BulkMarkPaidResult> {
  const db = getDb();
  const rows = await db
    .update(schema.invoices)
    .set({ status: "PAID", paymentMode: input.paymentMode, updatedBy: userId })
    .where(
      and(
        inArray(schema.invoices.id, input.ids),
        eq(schema.invoices.status, "PENDING")
      )
    )
    .returning({ id: schema.invoices.id });
  return { updated: rows.length };
}
