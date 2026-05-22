ALTER TABLE "center_profiles" ADD COLUMN "whatsapp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "whatsapp_api_token" text;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "whatsapp_phone_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_in" boolean DEFAULT true NOT NULL;