CREATE TABLE `price_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`changed_on` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_changes_product_id_idx` ON `price_changes` (`product_id`);--> statement-breakpoint
-- Every existing Product starts its Price history with its current Price,
-- dated no later than its first Subscription (or the day this runs).
INSERT INTO `price_changes` (`product_id`, `price_cents`, `changed_on`)
SELECT `id`, `price_cents`, coalesce((SELECT min(`subscribed_on`) FROM `subscriptions` WHERE `subscriptions`.`product_id` = `products`.`id`), date('now'))
FROM `products` ORDER BY `id`;
--> statement-breakpoint
-- SQLite can't add a NOT NULL column without a default, so the table is
-- rebuilt. The libSQL migrator turns foreign keys off around migrations, so
-- dropping the old table doesn't cascade to Deliveries.
CREATE TABLE `__new_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`delivery_schedule` text NOT NULL,
	`subscribed_on` text NOT NULL,
	`price_change_id` integer NOT NULL,
	`schedule_starts_on` text NOT NULL,
	`next_due_on` text NOT NULL,
	`cancelled_on` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`price_change_id`) REFERENCES `price_changes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions` (`id`, `account_id`, `product_id`, `delivery_schedule`, `subscribed_on`, `price_change_id`, `schedule_starts_on`, `next_due_on`, `cancelled_on`)
SELECT `id`, `account_id`, `product_id`, `delivery_schedule`, `subscribed_on`, (SELECT `price_changes`.`id` FROM `price_changes` WHERE `price_changes`.`product_id` = `subscriptions`.`product_id`), `schedule_starts_on`, `next_due_on`, `cancelled_on`
FROM `subscriptions`;
--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
CREATE INDEX `subscriptions_account_id_idx` ON `subscriptions` (`account_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_product_id_idx` ON `subscriptions` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_one_active_per_product` ON `subscriptions` (`account_id`,`product_id`) WHERE "subscriptions"."cancelled_on" is null;
