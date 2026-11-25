CREATE TABLE `charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`charged_on` text NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `charges_delivery_id_unique` ON `charges` (`delivery_id`);