ALTER TABLE `center_profiles` ADD `whatsapp_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `whatsapp_api_token` text;--> statement-breakpoint
ALTER TABLE `center_profiles` ADD `whatsapp_phone_id` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `whatsapp_opt_in` integer DEFAULT true NOT NULL;