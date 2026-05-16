// src/server/handlers/services.ts
// Pure service handlers — direct port of the SERVICES_* and SERVICE_CHECKLIST_*
// safeHandle blocks in src/main/index.ts. Numeric columns come back from
// postgres-js as strings; serializeService coerces them to numbers so the wire
// format matches the existing Service zod schema in src/shared/types.ts.

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import {
  serviceSchema,
  bulkUpdateServicesSchema,
  bulkDeleteServicesSchema,
  checklistUpsertBulkSchema,
  type BulkDeleteServicesResult,
} from "@/shared/types";

type ServiceRow = typeof schema.services.$inferSelect;

export interface Service {
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

function serializeService(row: ServiceRow): Service {
  return {
    ...row,
    defaultPrice: Number(row.defaultPrice ?? 0),
    taxRate: Number(row.taxRate ?? 0),
  };
}

export async function listServices(): Promise<Service[]> {
  const db = getDb();
  const rows = await db.select().from(schema.services);
  return rows.map(serializeService);
}

export async function getService(id: number): Promise<Service | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.id, id))
    .limit(1);
  return row ? serializeService(row) : null;
}

export async function getBookmarkedServices(): Promise<Service[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.services)
    .where(
      and(
        eq(schema.services.isBookmarked, true),
        eq(schema.services.isActive, true)
      )
    );
  return rows.map(serializeService);
}

export const serviceCreateSchema = serviceSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
});
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;

export async function createService(
  input: ServiceCreateInput,
  userId: number
): Promise<Service> {
  const db = getDb();
  const [row] = await db
    .insert(schema.services)
    .values({
      ...input,
      // numeric columns accept strings; coerce explicitly so a JS number
      // doesn't get serialised in scientific notation.
      defaultPrice: input.defaultPrice.toString(),
      taxRate: input.taxRate.toString(),
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();
  return serializeService(row);
}

export const serviceUpdateSchema = serviceSchema
  .omit({ id: true, createdBy: true, updatedBy: true })
  .partial();
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export async function updateService(
  id: number,
  input: ServiceUpdateInput,
  userId: number
): Promise<Service | null> {
  const db = getDb();
  const patch: Record<string, unknown> = { ...input, updatedBy: userId };
  if (input.defaultPrice !== undefined) {
    patch.defaultPrice = input.defaultPrice.toString();
  }
  if (input.taxRate !== undefined) {
    patch.taxRate = input.taxRate.toString();
  }
  const [row] = await db
    .update(schema.services)
    .set(patch)
    .where(eq(schema.services.id, id))
    .returning();
  return row ? serializeService(row) : null;
}

// Atomic toggle: single UPDATE with NOT, no read-modify-write race. Safer
// than the SQLite version even though Phase 1 is single-instance.
export async function toggleBookmark(id: number): Promise<Service> {
  const db = getDb();
  const [row] = await db
    .update(schema.services)
    .set({ isBookmarked: sql`NOT ${schema.services.isBookmarked}` })
    .where(eq(schema.services.id, id))
    .returning();
  if (!row) throw new Error("Service not found");
  return serializeService(row);
}

export async function deleteService(id: number): Promise<{ success: true }> {
  const db = getDb();
  await db.delete(schema.services).where(eq(schema.services.id, id));
  return { success: true };
}

export const bulkUpdateInputSchema = bulkUpdateServicesSchema;
export type BulkUpdateInput = z.infer<typeof bulkUpdateInputSchema>;

export async function bulkUpdateServices(
  input: BulkUpdateInput
): Promise<{ updated: number }> {
  const db = getDb();
  // Single UPDATE ... WHERE id IN (...) instead of a per-row loop. Postgres
  // does this in one statement; we count via the returning() array length.
  const rows = await db
    .update(schema.services)
    .set(input.patch)
    .where(inArray(schema.services.id, input.ids))
    .returning({ id: schema.services.id });
  return { updated: rows.length };
}

export const bulkDeleteInputSchema = bulkDeleteServicesSchema;
export type BulkDeleteInput = z.infer<typeof bulkDeleteInputSchema>;

// In-use guard: services referenced by any invoice_items row are returned in
// skippedInUse and not deleted. Backed by idx_invoice_items_service so the
// scan stays cheap as invoice volume grows.
export async function bulkDeleteServices(
  input: BulkDeleteInput
): Promise<BulkDeleteServicesResult> {
  const db = getDb();
  const inUse = await db
    .selectDistinct({ id: schema.invoiceItems.serviceId })
    .from(schema.invoiceItems)
    .where(inArray(schema.invoiceItems.serviceId, input.ids));
  const skippedInUse = inUse.map((r) => r.id);
  const inUseSet = new Set(skippedInUse);
  const safeIds = input.ids.filter((id) => !inUseSet.has(id));
  const rows =
    safeIds.length === 0
      ? []
      : await db
          .delete(schema.services)
          .where(inArray(schema.services.id, safeIds))
          .returning({ id: schema.services.id });
  return { deleted: rows.length, skippedInUse };
}

// ── Service checklist ───────────────────────────────────────────────────────

export interface ServiceChecklistItem {
  id: number;
  serviceId: number;
  documentName: string;
  isRequired: boolean;
  notes: string;
  sortOrder: number;
}

export async function listChecklist(
  serviceId: number
): Promise<ServiceChecklistItem[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.serviceChecklists)
    .where(eq(schema.serviceChecklists.serviceId, serviceId))
    .orderBy(schema.serviceChecklists.sortOrder);
}

export const checklistUpsertSchema = checklistUpsertBulkSchema;
export type ChecklistUpsertInput = z.infer<typeof checklistUpsertSchema>;

// Replace-all semantics inside a single transaction:
//   - rows with an id present in the payload are updated
//   - rows without an id are inserted
//   - existing rows whose id is NOT in the payload are deleted
// sortOrder defaults to the array index so callers can rely on submission
// order without filling the field explicitly.
export async function upsertChecklistBulk(
  input: ChecklistUpsertInput
): Promise<ServiceChecklistItem[]> {
  const db = getDb();
  const { serviceId, items } = input;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: schema.serviceChecklists.id })
      .from(schema.serviceChecklists)
      .where(eq(schema.serviceChecklists.serviceId, serviceId));

    const keepIds = new Set(
      items.filter((i) => i.id !== undefined).map((i) => i.id as number)
    );
    const toDelete = existing
      .filter((e) => !keepIds.has(e.id))
      .map((e) => e.id);

    if (toDelete.length > 0) {
      await tx
        .delete(schema.serviceChecklists)
        .where(inArray(schema.serviceChecklists.id, toDelete));
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const ord = item.sortOrder ?? idx;
      if (item.id !== undefined) {
        await tx
          .update(schema.serviceChecklists)
          .set({
            documentName: item.documentName,
            isRequired: item.isRequired,
            notes: item.notes,
            sortOrder: ord,
          })
          .where(eq(schema.serviceChecklists.id, item.id));
      } else {
        await tx.insert(schema.serviceChecklists).values({
          serviceId,
          documentName: item.documentName,
          isRequired: item.isRequired,
          notes: item.notes,
          sortOrder: ord,
        });
      }
    }

    return tx
      .select()
      .from(schema.serviceChecklists)
      .where(eq(schema.serviceChecklists.serviceId, serviceId))
      .orderBy(schema.serviceChecklists.sortOrder);
  });
}

// Body schema used by the PUT /api/services/:id/checklist route — the
// serviceId is taken from the URL, not from the body, so the route accepts
// just the items array.
export const checklistBodySchema = checklistUpsertBulkSchema.omit({
  serviceId: true,
});
export type ChecklistBodyInput = z.infer<typeof checklistBodySchema>;
