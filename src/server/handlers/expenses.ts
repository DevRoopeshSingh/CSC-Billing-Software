import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

export const expenseCreateSchema = z.object({
  amount: z.number().min(0.01),
  category: z.string().min(1),
  description: z.string().optional().default(""),
  paymentMode: z.string().optional().default("Cash"),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  expenseDate: Date;
  paymentMode: string;
  createdBy: number | null;
  createdAt: Date;
}

export async function listExpenses(): Promise<Expense[]> {
  const db = getDb();
  const rows = await db.select().from(schema.expenses).orderBy(desc(schema.expenses.expenseDate));
  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));
}

export async function createExpense(
  input: ExpenseCreateInput,
  userId: number
): Promise<Expense> {
  const db = getDb();
  const [row] = await db
    .insert(schema.expenses)
    .values({
      amount: input.amount.toString(),
      category: input.category,
      description: input.description,
      paymentMode: input.paymentMode,
      createdBy: userId,
    })
    .returning();
  return {
    ...row,
    amount: Number(row.amount),
  };
}
