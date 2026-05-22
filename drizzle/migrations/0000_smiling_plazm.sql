CREATE TABLE `agent_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_type` text NOT NULL,
	`session_id` text DEFAULT '' NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_name` text DEFAULT '' NOT NULL,
	`tool_input` text DEFAULT '' NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`scope` text DEFAULT 'copilot' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE TABLE `center_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`center_name` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`mobile` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`udyam_number` text DEFAULT '' NOT NULL,
	`logo_path` text,
	`upi_qr_path` text,
	`upi_id` text,
	`invoice_prefix` text DEFAULT 'INV-' NOT NULL,
	`invoice_number` integer DEFAULT 0 NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`default_tax_rate` real DEFAULT 0 NOT NULL,
	`default_payment_mode` text DEFAULT 'Cash' NOT NULL,
	`last_backup_date` integer,
	`pin_hash` text,
	`operating_hours` text DEFAULT '' NOT NULL,
	`center_description` text DEFAULT '' NOT NULL,
	`printer_interface` text DEFAULT 'tcp://192.168.1.100:9100' NOT NULL,
	`printer_type` text DEFAULT 'EPSON' NOT NULL,
	`print_upi_qr` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mobile` text DEFAULT '' NOT NULL,
	`remarks` text,
	`email` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faq_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`service_id` integer NOT NULL,
	`description` text NOT NULL,
	`qty` integer NOT NULL,
	`rate` real NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`line_total` real NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_no` text NOT NULL,
	`created_at` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`subtotal` real NOT NULL,
	`tax_total` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`payment_mode` text DEFAULT 'Cash' NOT NULL,
	`status` text DEFAULT 'PAID' NOT NULL,
	`notes` text,
	`customer_notes` text,
	`printed_at` integer,
	`created_by` integer,
	`updated_by` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_no_unique` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mobile` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`service_interest` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`converted_customer_id` integer,
	`created_by` integer,
	`updated_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`channel` text DEFAULT 'whatsapp' NOT NULL,
	`body` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_checklists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`document_name` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Other Services' NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`default_price` real DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`price_is_starting_from` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_bookmarked` integer DEFAULT false NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);