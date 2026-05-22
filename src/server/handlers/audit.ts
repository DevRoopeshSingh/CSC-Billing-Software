import { desc, and, eq, gte, lte } from "drizzle-orm";
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

export interface AuditLogFilters {
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const db = getDb();

  const conditions = [];
  if (filters.action) conditions.push(eq(schema.auditLogs.action, filters.action));
  if (filters.entityType) conditions.push(eq(schema.auditLogs.entityType, filters.entityType));
  if (filters.userId) conditions.push(eq(schema.auditLogs.userId, filters.userId));
  if (filters.startDate) conditions.push(gte(schema.auditLogs.createdAt, new Date(filters.startDate)));
  if (filters.endDate) conditions.push(lte(schema.auditLogs.createdAt, new Date(filters.endDate)));

  const rows = await db.query.auditLogs.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(schema.auditLogs.createdAt)],
    limit: filters.limit ?? 200,
    with: {
      user: true,
    },
  });
  
  return rows.map((r) => ({
    ...r,
    user: r.user ? { name: r.user.username, email: r.user.email } : null,
  }));
}
