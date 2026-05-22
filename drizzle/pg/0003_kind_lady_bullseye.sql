CREATE TABLE IF NOT EXISTS "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"expense_date" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_mode" text DEFAULT 'Cash' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_handovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_date" timestamp with time zone DEFAULT now() NOT NULL,
	"starting_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expected_ending_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"actual_ending_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discrepancy" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
