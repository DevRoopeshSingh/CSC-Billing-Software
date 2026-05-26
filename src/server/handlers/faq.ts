import { desc, eq, asc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";

export const faqCreateSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional().default("General"),
  tags: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
});

export const faqUpdateSchema = faqCreateSchema.partial();

export type FaqCreateInput = z.infer<typeof faqCreateSchema>;
export type FaqUpdateInput = z.infer<typeof faqUpdateSchema>;

export async function listFaqs() {
  const db = getDb();
  return db
    .select()
    .from(schema.faqEntries)
    .orderBy(asc(schema.faqEntries.sortOrder), desc(schema.faqEntries.createdAt));
}

export async function createFaq(input: FaqCreateInput, userId: number) {
  const db = getDb();
  const [row] = await db
    .insert(schema.faqEntries)
    .values({ ...input, createdBy: userId })
    .returning();
  return row;
}

export async function updateFaq(id: number, input: FaqUpdateInput, userId: number) {
  const db = getDb();
  const [row] = await db
    .update(schema.faqEntries)
    .set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(eq(schema.faqEntries.id, id))
    .returning();
  return row;
}

export async function deleteFaq(id: number) {
  const db = getDb();
  await db.delete(schema.faqEntries).where(eq(schema.faqEntries.id, id));
  return { success: true };
}
