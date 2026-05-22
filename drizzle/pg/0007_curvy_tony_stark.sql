ALTER TABLE "center_profiles" ADD COLUMN "cloud_backup_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "s3_endpoint" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "s3_access_key" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "s3_secret_key" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "s3_bucket" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "backup_encryption_key" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "cron_secret" text;