import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "cloud_backup_enabled" boolean DEFAULT false NOT NULL\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "s3_endpoint" text\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "s3_access_key" text\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "s3_secret_key" text\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "s3_bucket" text\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "backup_encryption_key" text\`;
    await sql\`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "cron_secret" text\`;
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
