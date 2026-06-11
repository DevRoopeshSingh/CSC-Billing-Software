ALTER TABLE "shift_handovers" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "start_time" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "end_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "total_cash_collected" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "digital_payments_collected" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "udhar_issued" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD COLUMN "expenses_during_shift" numeric(12, 2) DEFAULT '0' NOT NULL;