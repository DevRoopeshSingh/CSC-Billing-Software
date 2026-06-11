import { desc, eq, gt, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

export const shiftStartSchema = z.object({
  startingCash: z.number().min(0),
});

export const shiftCloseSchema = z.object({
  actualEndingCash: z.number().min(0),
  notes: z.string().optional().default(""),
});

export type ShiftStartInput = z.infer<typeof shiftStartSchema>;
export type ShiftCloseInput = z.infer<typeof shiftCloseSchema>;

export interface Shift {
  id: number;
  status: string;
  startTime: Date;
  endTime: Date | null;
  startingCash: number;
  expectedEndingCash: number;
  actualEndingCash: number;
  totalCashCollected: number;
  digitalPaymentsCollected: number;
  udharIssued: number;
  expensesDuringShift: number;
  discrepancy: number;
  notes: string;
  createdBy: number | null;
  createdAt: Date;
}

function serializeShift(r: any): Shift {
  return {
    ...r,
    startingCash: Number(r.startingCash),
    expectedEndingCash: Number(r.expectedEndingCash),
    actualEndingCash: Number(r.actualEndingCash),
    totalCashCollected: Number(r.totalCashCollected),
    digitalPaymentsCollected: Number(r.digitalPaymentsCollected),
    udharIssued: Number(r.udharIssued),
    expensesDuringShift: Number(r.expensesDuringShift),
    discrepancy: Number(r.discrepancy),
    notes: r.notes ?? "",
  };
}

export async function listShifts(): Promise<Shift[]> {
  const db = getDb();
  const rows = await db.select().from(schema.shiftHandovers).orderBy(desc(schema.shiftHandovers.startTime));
  return rows.map(serializeShift);
}

export async function getActiveShift(): Promise<Shift | null> {
  const db = getDb();
  // For MVP, assuming a single global active shift for the center. If multi-operator, filter by createdBy.
  const [active] = await db
    .select()
    .from(schema.shiftHandovers)
    .where(eq(schema.shiftHandovers.status, "ACTIVE"))
    .limit(1);
  return active ? serializeShift(active) : null;
}

export async function startShift(input: ShiftStartInput, userId: number): Promise<Shift> {
  const db = getDb();
  
  // Check if there is already an active shift
  const existing = await getActiveShift();
  if (existing) {
    throw new Error("A shift is already active. Please close it first.");
  }

  const [row] = await db
    .insert(schema.shiftHandovers)
    .values({
      status: "ACTIVE",
      startTime: new Date(),
      startingCash: input.startingCash.toString(),
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();
    
  return serializeShift(row);
}

export async function getExpectedShiftMath(shiftId: number) {
  const db = getDb();
  const [shift] = await db.select().from(schema.shiftHandovers).where(eq(schema.shiftHandovers.id, shiftId));
  if (!shift) throw new Error("Shift not found");

  const startTime = shift.startTime;
  const endTime = new Date();

  // 1. Invoices created during this shift
  const invoices = await db
    .select()
    .from(schema.invoices)
    .where(
      and(
        gt(schema.invoices.createdAt, startTime),
        eq(schema.invoices.status, "PAID")
      )
    );
    
  // 2. Payments (subsequent) received during this shift
  const payments = await db
    .select()
    .from(schema.payments)
    .where(gt(schema.payments.paymentDate, startTime));

  // 3. Expenses during this shift
  const expenses = await db
    .select()
    .from(schema.expenses)
    .where(gt(schema.expenses.expenseDate, startTime));

  // Calculate metrics
  let cashCollected = 0;
  let digitalCollected = 0;
  let udharIssued = 0; // PENDING invoices

  // Advance payments on invoices
  const allInvoices = await db.select().from(schema.invoices).where(gt(schema.invoices.createdAt, startTime));
  for (const inv of allInvoices) {
    if (inv.status !== "CANCELLED") {
      const adv = Number(inv.advancePayment);
      if (inv.paymentMode === "Cash") {
        cashCollected += adv;
      } else {
        digitalCollected += adv;
      }
      
      const bal = Number(inv.balanceAmount);
      if (bal > 0) {
        udharIssued += bal;
      }
    }
  }

  // Subsequent payments
  for (const p of payments) {
    if (p.paymentMode === "Cash") {
      cashCollected += Number(p.amount);
    } else {
      digitalCollected += Number(p.amount);
    }
  }

  const cashExpenses = expenses.filter(e => e.paymentMode === "Cash").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const expectedEndingCash = Number(shift.startingCash) + cashCollected - cashExpenses;

  return {
    startTime,
    startingCash: Number(shift.startingCash),
    totalCashCollected: cashCollected,
    digitalPaymentsCollected: digitalCollected,
    udharIssued,
    expensesDuringShift: totalExpenses,
    expectedEndingCash,
  };
}

export async function closeShift(id: number, input: ShiftCloseInput, userId: number): Promise<Shift> {
  const db = getDb();
  
  return await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(schema.shiftHandovers).where(eq(schema.shiftHandovers.id, id));
    if (!existing) throw new Error("Shift not found");
    if (existing.status === "CLOSED") throw new Error("Shift is already closed");

    const math = await getExpectedShiftMath(id);
    const discrepancy = input.actualEndingCash - math.expectedEndingCash;

    const [row] = await tx
      .update(schema.shiftHandovers)
      .set({
        status: "CLOSED",
        endTime: new Date(),
        totalCashCollected: math.totalCashCollected.toString(),
        digitalPaymentsCollected: math.digitalPaymentsCollected.toString(),
        udharIssued: math.udharIssued.toString(),
        expensesDuringShift: math.expensesDuringShift.toString(),
        expectedEndingCash: math.expectedEndingCash.toString(),
        actualEndingCash: input.actualEndingCash.toString(),
        discrepancy: discrepancy.toString(),
        notes: input.notes,
        updatedBy: userId,
      })
      .where(eq(schema.shiftHandovers.id, id))
      .returning();

    return serializeShift(row);
  });
}
