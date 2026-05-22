import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth/sessions";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    let isAuthenticated = false;
    let authError = "Unauthorized";

    // Check session first (for manual trigger via UI)
    const sessionToken = req.cookies.get("session")?.value;
    if (sessionToken) {
      const session = await getSession(sessionToken);
      if (session && session.role === "admin") {
        isAuthenticated = true;
      }
    }

    const db = getDb();

    // 2. Load center profile to check for cloud backup config
    const [profile] = await db
      .select()
      .from(schema.centerProfiles)
      .where(eq(schema.centerProfiles.id, 1))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Center profile not found" }, { status: 500 });
    }

    if (!profile.cloudBackupEnabled) {
      return NextResponse.json({ error: "Cloud backup is disabled in settings" }, { status: 400 });
    }

    if (!profile.s3Endpoint || !profile.s3AccessKey || !profile.s3SecretKey || !profile.s3Bucket) {
      return NextResponse.json({ error: "Cloud backup S3 configuration is incomplete" }, { status: 400 });
    }

    if (!profile.backupEncryptionKey) {
      return NextResponse.json({ error: "Backup encryption key is missing" }, { status: 400 });
    }

    // Check Bearer token (for automated cron triggers)
    if (!isAuthenticated) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        if (profile.cronSecret && token === profile.cronSecret) {
          isAuthenticated = true;
        } else {
          authError = "Invalid cron secret";
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // 3. Fetch all critical data via Drizzle
    const [
      users,
      customers,
      services,
      serviceChecklists,
      invoices,
      invoiceItems,
      expenses,
      auditLogs,
      shiftHandovers,
      loyaltyTransactions,
    ] = await Promise.all([
      db.select().from(schema.users),
      db.select().from(schema.customers),
      db.select().from(schema.services),
      db.select().from(schema.serviceChecklists),
      db.select().from(schema.invoices),
      db.select().from(schema.invoiceItems),
      db.select().from(schema.expenses),
      db.select().from(schema.auditLogs),
      db.select().from(schema.shiftHandovers),
      db.select().from(schema.loyaltyTransactions),
    ]);

    // Build the JSON snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        centerProfile: profile,
        users,
        customers,
        services,
        serviceChecklists,
        invoices,
        invoiceItems,
        expenses,
        auditLogs,
        shiftHandovers,
        loyaltyTransactions,
      },
    };

    const payloadString = JSON.stringify(snapshot);

    // 4. Encrypt the payload using aes-256-gcm
    // Use a fixed 32-byte key derived from the backupEncryptionKey (using SHA-256)
    const key = crypto.createHash("sha256").update(profile.backupEncryptionKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(payloadString, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Package the IV, Auth Tag, and Encrypted Data together
    const finalPayload = Buffer.concat([iv, authTag, encrypted]);

    // 5. Upload to S3
    const s3Client = new S3Client({
      region: "auto", // Typically "auto" works for Supabase/Cloudflare. S3 usually requires an actual region, but S3 API endpoints often accept "auto" or it can be derived from the endpoint.
      endpoint: profile.s3Endpoint,
      credentials: {
        accessKeyId: profile.s3AccessKey,
        secretAccessKey: profile.s3SecretKey,
      },
      // Force path style if needed, often required for non-AWS providers like Supabase Storage
      forcePathStyle: true,
    });

    const filename = `backup_${new Date().toISOString().split("T")[0]}-${Date.now()}.json.enc`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: profile.s3Bucket,
        Key: filename,
        Body: finalPayload,
        ContentType: "application/octet-stream",
      })
    );

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("[Cloud Sync Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync to cloud" },
      { status: 500 }
    );
  }
}
