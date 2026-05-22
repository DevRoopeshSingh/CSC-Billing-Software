ALTER TABLE "invoices" ADD COLUMN "advance_payment" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "balance_amount" numeric(12, 2) DEFAULT '0' NOT NULL;