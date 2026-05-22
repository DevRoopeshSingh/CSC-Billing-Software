import { desc } from "drizzle-orm";
import { getDb, schema } from "../db";

export type AuditLogInput = {
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
};

export async function logAudit(input: AuditLogInput) {
  const db = getDb();
  await db.insert(schema.auditLogs).values({
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details,
  });
}

export async function listAuditLogs(limit: number = 50) {
  const db = getDb();
  const rows = await db.query.auditLogs.findMany({
    orderBy: [desc(schema.auditLogs.createdAt)],
    limit,
    with: {
      user: true, // We need to add relations in schema for user
    },
  });
  
  return rows.map((r) => ({
    ...r,
    user: r.user ? { name: r.user.username, email: r.user.email } : null,
  }));
}
