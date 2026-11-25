CREATE TABLE `delivery_addresses` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`street` text NOT NULL,
	`suburb` text NOT NULL,
	`city` text NOT NULL,
	`postal_code` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`delivery_schedule` text NOT NULL,
	`subscribed_on` text NOT NULL,
	`schedule_starts_on` text NOT NULL,
	`next_due_on` text NOT NULL,
	`cancelled_on` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscriptions_account_id_idx` ON `subscriptions` (`account_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_product_id_idx` ON `subscriptions` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_one_active_per_product` ON `subscriptions` (`account_id`,`product_id`) WHERE "subscriptions"."cancelled_on" is null;