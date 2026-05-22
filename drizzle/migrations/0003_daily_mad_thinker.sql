ALTER TABLE `center_profiles` ADD `cloud_backup_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `s3_endpoint` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `s3_access_key` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `s3_secret_key` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `s3_bucket` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `backup_encryption_key` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `cron_secret` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `sms_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `sms_provider` text DEFAULT 'fast2sms' NOT NULL;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `sms_api_token` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `sms_sender_id` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `sms_template_id` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `sms_opt_in` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `loyalty_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD `gov_charge` real DEFAULT 0 NOT NULL;