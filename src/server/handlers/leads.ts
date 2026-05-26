import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

export const leadCreateSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  serviceInterest: z.string().optional().default(""),
  source: z.string().optional().default("manual"),
  status: z.string().optional().default("NEW"),
  notes: z.string().optional().default(""),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  status: z.string().optional(),
  convertedCustomerId: z.number().optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export async function listLeads() {
  const db = getDb();
  return db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
}

export async function createLead(input: LeadCreateInput, userId: number) {
  const db = getDb();
  const [row] = await db
    .insert(schema.leads)
    .values({ ...input, createdBy: userId })
    .returning();
  return row;
}

export async function updateLead(id: number, input: LeadUpdateInput, userId: number) {
  const db = getDb();
  const [row] = await db
    .update(schema.leads)
    .set({ ...input, updatedBy: userId })
    .where(eq(schema.leads.id, id))
    .returning();
  return row;
}

export async function deleteLead(id: number) {
  const db = getDb();
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
  return { success: true };
}
