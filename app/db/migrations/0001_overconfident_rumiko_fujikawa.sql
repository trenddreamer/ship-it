CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`kind` text NOT NULL,
	`vendor_id` integer,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "accounts_vendor_kind" CHECK(("accounts"."kind" = 'vendor') = ("accounts"."vendor_id" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_idx` ON `accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_vendor_id_idx` ON `accounts` (`vendor_id`);