CREATE TABLE `product_delivery_schedules` (
	`product_id` integer NOT NULL,
	`delivery_schedule` text NOT NULL,
	PRIMARY KEY(`product_id`, `delivery_schedule`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
