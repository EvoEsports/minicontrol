CREATE TABLE `player` (
	`login` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`custom_nick` text DEFAULT '',
	`nick_override` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_login_unique` ON `player` (`login`);