import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logAudit } from "./audit";

export async function getCustomerDocuments(customerId: number) {
  const db = getDb();
  return db
    .select()
    .from(schema.customerDocuments)
    .where(eq(schema.customerDocuments.customerId, customerId));
}

export async function uploadCustomerDocument(args: {
  customerId: number;
  name: string;
  mimeType: string;
  data: Buffer;
  userId: number | null;
}) {
  const db = getDb();
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const rawExt = args.mimeType.split('/')[1] || 'bin';
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${args.customerId}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  // Write file to disk
  fs.writeFileSync(filePath, args.data);

  // Insert DB record
  const [row] = await db
    .insert(schema.customerDocuments)
    .values({
      customerId: args.customerId,
      name: args.name,
      mimeType: args.mimeType,
      filePath: fileName, // Store relative path
      createdAt: new Date(),
    })
    .returning();

  await logAudit({
    userId: args.userId,
    action: "CREATE",
    entityType: "DOCUMENT",
    entityId: String(row.id),
    details: { customerId: args.customerId, name: args.name },
  });

  return row;
}

export async function deleteCustomerDocument(id: number, userId: number | null) {
  const db = getDb();
  
  const [doc] = await db
    .select()
    .from(schema.customerDocuments)
    .where(eq(schema.customerDocuments.id, id));

  if (!doc) throw new Error("Document not found");

  const uploadsDir = path.join(process.env.USER_DATA_PATH || process.cwd(), "uploads");
  const safeFilePath = path.basename(doc.filePath);
  const fullPath = path.join(uploadsDir, safeFilePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  await db.delete(schema.customerDocuments).where(eq(schema.customerDocuments.id, id));

  await logAudit({
    userId,
    action: "DELETE",
    entityType: "DOCUMENT",
    entityId: String(id),
    details: { customerId: doc.customerId, name: doc.name },
  });

  return { success: true };
}
