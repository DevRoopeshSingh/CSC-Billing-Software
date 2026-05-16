CREATE TABLE IF NOT EXISTS "branding_assets" (
	"kind" text PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
