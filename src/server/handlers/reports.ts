// src/server/handlers/reports.ts
// Report handlers — direct port of the REPORTS_* safeHandle blocks from the
// old Electron main process. Queries run against Postgres via Drizzle.

import { and, eq, gte, lte, ne, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReportSummary {
  totals: {
    invoiceCount: number;
    subtotal: number;
    taxTotal: number;
    discount: number;
    revenue: number;
  };
  byStatus: Record<"PAID" | "PENDING" | "CANCELLED", { count: number; total: number }>;
  byPaymentMode: { paymentMode: string; count: number; total: number }[];
}

export interface PendingDues {
  count: number;
  total: number;
}

// ── Input schemas ────────────────────────────────────────────────────────────

export const reportSummaryInputSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ReportSummaryInput = z.infer<typeof reportSummaryInputSchema>;

export const topNSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.coerce.number().int().positive().max(50).default(5),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Revenue summary for a date range. Excludes CANCELLED invoices.
 * Accepts { start, end } as YYYY-MM-DD strings.
 */
export async function getReportSummary(
  input: ReportSummaryInput
): Promise<ReportSummary> {
  const db = getDb();

  // Build date boundaries (start of start-day → end of end-day) in UTC.
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);

  const result = await db
    .select({
      invoiceCount: sql<number>`count(*)::int`,
      subtotal: sql<number>`coalesce(sum(${schema.invoices.subtotal}), 0)::numeric`,
      taxTotal: sql<number>`coalesce(sum(${schema.invoices.taxTotal}), 0)::numeric`,
      discount: sql<number>`coalesce(sum(${schema.invoices.discount}), 0)::numeric`,
      revenue: sql<number>`coalesce(sum(${schema.invoices.total}), 0)::numeric`,
    })
    .from(schema.invoices)
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate),
        ne(schema.invoices.status, "CANCELLED")
      )
    );

  const statusResult = await db
    .select({
      status: schema.invoices.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)::numeric`,
    })
    .from(schema.invoices)
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate)
      )
    )
    .groupBy(schema.invoices.status);

  const byStatus: Record<"PAID" | "PENDING" | "CANCELLED", { count: number; total: number }> = {
    PAID: { count: 0, total: 0 },
    PENDING: { count: 0, total: 0 },
    CANCELLED: { count: 0, total: 0 },
  };

  for (const row of statusResult) {
    if (row.status === "PAID" || row.status === "PENDING" || row.status === "CANCELLED") {
      byStatus[row.status] = {
        count: Number(row.count),
        total: Number(row.total),
      };
    }
  }

  const paymentResult = await db
    .select({
      paymentMode: schema.invoices.paymentMode,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)::numeric`,
    })
    .from(schema.invoices)
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate),
        ne(schema.invoices.status, "CANCELLED")
      )
    )
    .groupBy(schema.invoices.paymentMode);

  const byPaymentMode = paymentResult.map((row) => ({
    paymentMode: row.paymentMode,
    count: Number(row.count),
    total: Number(row.total),
  }));

  const row = result[0];
  return {
    totals: {
      invoiceCount: Number(row?.invoiceCount ?? 0),
      subtotal: Number(row?.subtotal ?? 0),
      taxTotal: Number(row?.taxTotal ?? 0),
      discount: Number(row?.discount ?? 0),
      revenue: Number(row?.revenue ?? 0),
    },
    byStatus,
    byPaymentMode,
  } as ReportSummary;
}

/**
 * All-time pending (unpaid) invoices count and total amount.
 */
export async function getPendingDues(): Promise<PendingDues> {
  const db = getDb();

  const result = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)::numeric`,
    })
    .from(schema.invoices)
    .where(eq(schema.invoices.status, "PENDING"));

  const row = result[0];
  return {
    count: Number(row?.count ?? 0),
    total: Number(row?.total ?? 0),
  };
}

export async function getTopCustomers(input: z.infer<typeof topNSchema>) {
  const db = getDb();
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);
  const limit = input.limit ?? 5;

  const revenueExpr = sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`
    .mapWith(Number)
    .as("revenue");

  return db
    .select({
      customerId: schema.customers.id,
      customerName: schema.customers.name,
      invoiceCount: sql<number>`COUNT(${schema.invoices.id})`.mapWith(Number),
      revenue: revenueExpr,
    })
    .from(schema.invoices)
    .innerJoin(
      schema.customers,
      eq(schema.invoices.customerId, schema.customers.id)
    )
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate),
        ne(schema.invoices.status, "CANCELLED")
      )
    )
    .groupBy(schema.customers.id)
    .orderBy(desc(revenueExpr))
    .limit(limit);
}

export async function getTopServices(input: z.infer<typeof topNSchema>) {
  const db = getDb();
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);
  const limit = input.limit ?? 5;

  const revenueExpr = sql<number>`COALESCE(SUM(${schema.invoiceItems.lineTotal}), 0)`
    .mapWith(Number)
    .as("revenue");

  return db
    .select({
      serviceId: schema.services.id,
      serviceName: schema.services.name,
      category: schema.services.category,
      qty: sql<number>`COALESCE(SUM(${schema.invoiceItems.qty}), 0)`.mapWith(Number),
      revenue: revenueExpr,
    })
    .from(schema.invoiceItems)
    .innerJoin(
      schema.invoices,
      eq(schema.invoiceItems.invoiceId, schema.invoices.id)
    )
    .innerJoin(
      schema.services,
      eq(schema.invoiceItems.serviceId, schema.services.id)
    )
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate),
        ne(schema.invoices.status, "CANCELLED")
      )
    )
    .groupBy(schema.services.id)
    .orderBy(desc(revenueExpr))
    .limit(limit);
}

export async function getInvoicesByRange(input: z.infer<typeof reportSummaryInputSchema>) {
  const db = getDb();
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);

  return db.query.invoices.findMany({
    where: and(
      gte(schema.invoices.createdAt, startDate),
      lte(schema.invoices.createdAt, endDate)
    ),
    with: { customer: true, items: true },
    orderBy: [desc(schema.invoices.createdAt)],
  });
}

export async function getOperatorPerformance(input: z.infer<typeof reportSummaryInputSchema>) {
  const db = getDb();
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);

  const invoices = await db.query.invoices.findMany({
    where: and(
      gte(schema.invoices.createdAt, startDate),
      lte(schema.invoices.createdAt, endDate),
      ne(schema.invoices.status, "CANCELLED")
    ),
    with: { creator: true },
  });

  const performance = new Map<number, { username: string; role: string; invoiceCount: number; revenue: number }>();

  for (const inv of invoices) {
    if (!inv.createdBy || !inv.creator) continue;
    const existing = performance.get(inv.createdBy) || {
      username: inv.creator.username,
      role: inv.creator.role,
      invoiceCount: 0,
      revenue: 0,
    };
    existing.invoiceCount += 1;
    existing.revenue += Number(inv.total) || 0;
    performance.set(inv.createdBy, existing);
  }

  return Array.from(performance.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getRevenueTrends(input: z.infer<typeof reportSummaryInputSchema>) {
  const db = getDb();
  const startDate = new Date(`${input.start}T00:00:00.000Z`);
  const endDate = new Date(`${input.end}T23:59:59.999Z`);

  const invoices = await db
    .select({
      createdAt: schema.invoices.createdAt,
      total: schema.invoices.total,
    })
    .from(schema.invoices)
    .where(
      and(
        gte(schema.invoices.createdAt, startDate),
        lte(schema.invoices.createdAt, endDate),
        ne(schema.invoices.status, "CANCELLED")
      )
    );

  const trends = new Map<string, { date: string; revenue: number; invoiceCount: number }>();

  for (const inv of invoices) {
    if (!inv.createdAt) continue;
    const dateStr = inv.createdAt.toISOString().split("T")[0];
    const existing = trends.get(dateStr) || { date: dateStr, revenue: 0, invoiceCount: 0 };
    existing.revenue += Number(inv.total) || 0;
    existing.invoiceCount += 1;
    trends.set(dateStr, existing);
  }

  return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
}
