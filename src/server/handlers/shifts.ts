import { desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

export const shiftCreateSchema = z.object({
  startingCash: z.number(),
  expectedEndingCash: z.number(),
  actualEndingCash: z.number(),
  discrepancy: z.number(),
  notes: z.string().optional().default(""),
});

export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;

export interface Shift {
  id: number;
  shiftDate: Date;
  startingCash: number;
  expectedEndingCash: number;
  actualEndingCash: number;
  discrepancy: number;
  notes: string;
  createdBy: number | null;
  createdAt: Date;
}

export async function listShifts(): Promise<Shift[]> {
  const db = getDb();
  const rows = await db.select().from(schema.shiftHandovers).orderBy(desc(schema.shiftHandovers.shiftDate));
  return rows.map((r) => ({
    ...r,
    startingCash: Number(r.startingCash),
    expectedEndingCash: Number(r.expectedEndingCash),
    actualEndingCash: Number(r.actualEndingCash),
    discrepancy: Number(r.discrepancy),
    notes: r.notes ?? "",
  }));
}

export async function createShift(
  input: ShiftCreateInput,
  userId: number
): Promise<Shift> {
  const db = getDb();
  const [row] = await db
    .insert(schema.shiftHandovers)
    .values({
      startingCash: input.startingCash.toString(),
      expectedEndingCash: input.expectedEndingCash.toString(),
      actualEndingCash: input.actualEndingCash.toString(),
      discrepancy: input.discrepancy.toString(),
      notes: input.notes,
      createdBy: userId,
    })
    .returning();
  return {
    ...row,
    startingCash: Number(row.startingCash),
    expectedEndingCash: Number(row.expectedEndingCash),
    actualEndingCash: Number(row.actualEndingCash),
    discrepancy: Number(row.discrepancy),
    notes: row.notes ?? "",
  };
}

export async function getExpectedShiftMath(): Promise<{ lastShiftDate: Date | null, startingCash: number, cashInvoices: number, cashExpenses: number, expectedEndingCash: number }> {
  const db = getDb();
  
  // Get last shift
  const [lastShift] = await db.select().from(schema.shiftHandovers).orderBy(desc(schema.shiftHandovers.shiftDate)).limit(1);
  const startingCash = lastShift ? Number(lastShift.actualEndingCash) : 0;
  const lastDate = lastShift ? lastShift.shiftDate : new Date(0); // Epoch if no shift

  // Get cash invoices since last shift
  const invoices = await db.select().from(schema.invoices).where(gt(schema.invoices.createdAt, lastDate));
  const cashInvoices = invoices.filter(i => i.paymentMode === 'Cash' && i.status === 'PAID').reduce((sum, i) => sum + Number(i.total), 0);

  // Get cash expenses since last shift
  const expenses = await db.select().from(schema.expenses).where(gt(schema.expenses.createdAt, lastDate));
  const cashExpenses = expenses.filter(e => e.paymentMode === 'Cash').reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    lastShiftDate: lastShift ? lastDate : null,
    startingCash,
    cashInvoices,
    cashExpenses,
    expectedEndingCash: startingCash + cashInvoices - cashExpenses,
  };
}
