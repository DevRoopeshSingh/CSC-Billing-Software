import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL as string);

async function run() {
  try {
    await sql`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "sms_enabled" boolean DEFAULT false NOT NULL`;
    await sql`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "sms_provider" text DEFAULT 'fast2sms' NOT NULL`;
    await sql`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "sms_api_token" text`;
    await sql`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "sms_sender_id" text`;
    await sql`ALTER TABLE "center_profiles" ADD COLUMN IF NOT EXISTS "sms_template_id" text`;
    await sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sms_opt_in" boolean DEFAULT true NOT NULL`;
    console.log("SMS Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
