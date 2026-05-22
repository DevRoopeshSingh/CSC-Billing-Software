// src/server/handlers/customers.ts
// Pure customer handlers — direct port of CUSTOMERS_* safeHandle blocks.
// Difference vs SQLite version: aggregations return numeric strings from
// postgres-js, so we mapWith(Number) to keep the wire shape identical.

import { and, eq, sql, getTableColumns } from "drizzle-orm";
import { getDb, schema } from "../db";
import { customerSchema } from "@/shared/types";
import { z } from "zod";
import { logAudit } from "./audit";

const notCancelled = sql`${schema.invoices.status} != 'CANCELLED'`;

export type ListCustomersRow = typeof schema.customers.$inferSelect & {
  invoiceCount: number;
  totalBilled: number;
};

export async function listCustomers(): Promise<ListCustomersRow[]> {
  const db = getDb();
  return db
    .select({
      ...getTableColumns(schema.customers),
      invoiceCount: sql<number>`count(${schema.invoices.id})`.mapWith(Number),
      totalBilled: sql<number>`COALESCE(sum(${schema.invoices.total}), 0)`.mapWith(
        Number
      ),
    })
    .from(schema.customers)
    .leftJoin(
      schema.invoices,
      and(eq(schema.customers.id, schema.invoices.customerId), notCancelled)
    )
    .groupBy(schema.customers.id);
}

export async function searchCustomers(q: string): Promise<ListCustomersRow[]> {
  const db = getDb();
  const pattern = `%${q}%`;
  return db
    .select({
      ...getTableColumns(schema.customers),
      invoiceCount: sql<number>`count(${schema.invoices.id})`.mapWith(Number),
      totalBilled: sql<number>`COALESCE(sum(${schema.invoices.total}), 0)`.mapWith(
        Number
      ),
    })
    .from(schema.customers)
    .leftJoin(
      schema.invoices,
      and(eq(schema.customers.id, schema.invoices.customerId), notCancelled)
    )
    .where(
      sql`${schema.customers.name} ILIKE ${pattern} OR ${schema.customers.mobile} ILIKE ${pattern}`
    )
    .groupBy(schema.customers.id);
}

export async function getCustomer(id: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, id))
    .limit(1);
  return row ?? null;
}

export const customerCreateSchema = customerSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
});
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export async function createCustomer(input: CustomerCreateInput, userId: number) {
  const db = getDb();
  const [row] = await db
    .insert(schema.customers)
    .values({ ...input, createdBy: userId, updatedBy: userId })
    .returning();
    
  await logAudit({
    userId,
    action: "CREATE",
    entityType: "CUSTOMER",
    entityId: String(row.id),
    details: { name: row.name, mobile: row.mobile, smsOptIn: row.smsOptIn },
  });
  
  return row;
}

export const customerUpdateSchema = customerSchema
  .omit({ id: true, createdBy: true, updatedBy: true })
  .partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export async function updateCustomer(
  id: number,
  input: CustomerUpdateInput,
  userId: number
) {
  const db = getDb();
  const [row] = await db
    .update(schema.customers)
    .set({ ...input, updatedBy: userId })
    .where(eq(schema.customers.id, id))
    .returning();
    
  if (row) {
    await logAudit({
      userId,
      action: "UPDATE",
      entityType: "CUSTOMER",
      entityId: String(row.id),
      details: input,
    });
  }
  
  return row ?? null;
}

export async function deleteCustomer(id: number, userId: number): Promise<{ success: true }> {
  const db = getDb();
  const [row] = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  if (row) {
    await db.delete(schema.customers).where(eq(schema.customers.id, id));
    await logAudit({
      userId,
      action: "DELETE",
      entityType: "CUSTOMER",
      entityId: String(id),
      details: { name: row.name, mobile: row.mobile },
    });
  }
  return { success: true };
}
