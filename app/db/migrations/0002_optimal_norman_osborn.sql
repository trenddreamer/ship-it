CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`sent_at` integer NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_account_id_idx` ON `notifications` (`account_id`);