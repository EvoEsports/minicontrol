CREATE TABLE `map` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`author` text NOT NULL,
	`author_nickname` text,
	`author_time` integer NOT NULL,
	`environment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `player` (
	`login` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`custom_nick` text DEFAULT '',
	`nick_override` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `records` (
	`map_uuid` text NOT NULL,
	`player` text NOT NULL,
	`time` integer NOT NULL,
	`checkpoints` text NOT NULL,
	`avg_time` integer DEFAULT 0,
	`finishes` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`map_uuid`) REFERENCES `map`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player`) REFERENCES `player`(`login`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `map` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `player_login_unique` ON `player` (`login`);--> statement-breakpoint
CREATE INDEX `uuid_idx` ON `records` (`map_uuid`);--> statement-breakpoint
CREATE INDEX `login_idx` ON `records` (`player`);