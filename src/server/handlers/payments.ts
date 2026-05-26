import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { paymentSchema, type Payment } from "@/shared/types";
import { logAudit } from "./audit";

export async function createPayment(input: Omit<Payment, "id">, userId: number): Promise<Payment> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // Insert the payment
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        invoiceId: input.invoiceId,
        amount: String(input.amount),
        paymentMode: input.paymentMode,
        referenceId: input.referenceId,
        paymentDate: input.paymentDate || new Date(),
        createdBy: userId,
      })
      .returning();

    // Fetch the current invoice to update balance
    const [invoice] = await tx
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, input.invoiceId));

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const currentBalance = Number(invoice.balanceAmount);
    const newBalance = Math.max(0, currentBalance - input.amount);
    const newStatus = newBalance <= 0 ? "PAID" : invoice.status; // Keep it as PENDING or whatever if not 0

    // Update the invoice
    await tx
      .update(schema.invoices)
      .set({
        balanceAmount: String(newBalance),
        status: newStatus,
        updatedBy: userId,
      })
      .where(eq(schema.invoices.id, input.invoiceId));

    await logAudit({
      userId,
      action: "CREATE",
      entityType: "PAYMENT",
      entityId: String(payment.id),
      details: { invoiceId: input.invoiceId, amount: input.amount, mode: input.paymentMode },
    });

    return {
      ...payment,
      amount: Number(payment.amount),
    } as Payment;
  });
}
