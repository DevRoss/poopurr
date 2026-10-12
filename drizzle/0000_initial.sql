CREATE TABLE `accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`connected_at` integer NOT NULL,
	`last_attempt` integer,
	`last_sync` integer,
	`status` text NOT NULL,
	`devices` text DEFAULT '[]' NOT NULL,
	`pets` text DEFAULT '[]' NOT NULL,
	`coverage` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`device_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`pet_id` text,
	`payload` text NOT NULL,
	PRIMARY KEY(`user_id`, `key`)
);
