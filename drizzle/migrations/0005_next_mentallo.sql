CREATE TABLE `designs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` integer NOT NULL,
	`canvas_state` text NOT NULL,
	`thumbnail` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
