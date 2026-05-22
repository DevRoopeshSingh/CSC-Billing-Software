ALTER TABLE "center_profiles" ADD COLUMN "sms_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "sms_provider" text DEFAULT 'fast2sms' NOT NULL;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "sms_api_token" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "sms_sender_id" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "sms_template_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "sms_opt_in" boolean DEFAULT true NOT NULL;