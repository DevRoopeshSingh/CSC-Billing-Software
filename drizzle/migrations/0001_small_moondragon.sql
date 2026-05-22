ALTER TABLE `invoices` ADD `advance_payment` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `balance_amount` real DEFAULT 0 NOT NULL;