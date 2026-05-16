// src/server/handlers/reports.ts
// Report handlers — direct port of the REPORTS_* safeHandle blocks from the
// old Electron main process. Queries run against Postgres via Drizzle.

import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
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

  const row = result[0];
  return {
    totals: {
      invoiceCount: Number(row?.invoiceCount ?? 0),
      subtotal: Number(row?.subtotal ?? 0),
      taxTotal: Number(row?.taxTotal ?? 0),
      discount: Number(row?.discount ?? 0),
      revenue: Number(row?.revenue ?? 0),
    },
  };
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
