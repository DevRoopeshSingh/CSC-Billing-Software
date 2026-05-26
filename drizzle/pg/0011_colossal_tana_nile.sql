CREATE TABLE IF NOT EXISTS "agent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_type" text NOT NULL,
	"session_id" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_name" text DEFAULT '' NOT NULL,
	"tool_input" text DEFAULT '' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"scope" text DEFAULT 'copilot' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "printer_interface" text DEFAULT 'tcp://192.168.1.100:9100' NOT NULL;--> statement-breakpoint
ALTER TABLE "center_profiles" ADD COLUMN "printer_type" text DEFAULT 'EPSON' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_by" integer;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "updated_by" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
