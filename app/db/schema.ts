// The Marketplace's database schema (Drizzle, SQLite). Name tables and
// columns in GLOSSARY.md's words.
//
// To change it: edit this file, run `npm run db:generate` to write a
// migration into app/db/migrations/, then `npm run db:migrate`. Commit the
// schema change and its migration together.
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const vendorApprovalStatuses = ["pending", "approved", "rejected"] as const;
export type VendorApprovalStatus = (typeof vendorApprovalStatuses)[number];

/** A business that sells Products. Only approved Vendors appear to Customers. */
export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  approvalStatus: text("approval_status", { enum: vendorApprovalStatuses })
    .notNull()
    .default("pending"),
});

/**
 * A physical good a Vendor sells. Price is per Delivery, in whole cents.
 * Once its Vendor stops selling it, `stopped_on` is the day they did, for
 * good: Customers no longer see it, and it can't be restarted.
 */
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    /** The day its Vendor stopped selling it (YYYY-MM-DD); null while on sale. */
    stoppedOn: text("stopped_on"),
  },
  (table) => [index("products_vendor_id_idx").on(table.vendorId)],
);

/**
 * A Product's Price history: one row per Price it has had, the first when it
 * was added, then one per change. Rows are in history order by `id`, which
 * also orders changes made on the same day. `products.price_cents` is the
 * latest row's Price.
 */
export const priceChanges = sqliteTable(
  "price_changes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** The Price from this change on, in whole cents. */
    priceCents: integer("price_cents").notNull(),
    /** The day it was made, "YYYY-MM-DD" in Africa/Johannesburg. */
    changedOn: text("changed_on").notNull(),
  },
  (table) => [index("price_changes_product_id_idx").on(table.productId)],
);

/** How often a Product is delivered under a Subscription. A fixed set. */
export const deliverySchedules = ["weekly", "every-two-weeks", "monthly"] as const;
export type DeliverySchedule = (typeof deliverySchedules)[number];

/**
 * A Delivery Schedule a Product offers: one row per schedule, and a Product
 * offers at least one (the catalogue module enforces that when it adds one).
 * When a Vendor stops offering a schedule, its row is deleted; stopping the
 * last one stops the Product instead, so the row stays.
 */
export const productDeliverySchedules = sqliteTable(
  "product_delivery_schedules",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    deliverySchedule: text("delivery_schedule", { enum: deliverySchedules }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.deliverySchedule] })],
);

export const accountKinds = ["customer", "vendor", "admin"] as const;
export type AccountKind = (typeof accountKinds)[number];

/**
 * How a person signs in: an email and a password, stored only as a scrypt
 * hash. Each Account is exactly one kind. A Vendor Account points at its
 * Vendor; no other kind has one.
 */
export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    kind: text("kind", { enum: accountKinds }).notNull(),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("accounts_email_idx").on(table.email),
    uniqueIndex("accounts_vendor_id_idx").on(table.vendorId),
    check(
      "accounts_vendor_kind",
      sql`(${table.kind} = 'vendor') = (${table.vendorId} is not null)`,
    ),
  ],
);

/**
 * Where a Customer's Deliveries are sent: one per Customer Account, used for
 * all their Subscriptions.
 */
export const deliveryAddresses = sqliteTable("delivery_addresses", {
  accountId: integer("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  street: text("street").notNull(),
  suburb: text("suburb").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
});

/**
 * A Customer's ongoing arrangement to receive one Product on a Delivery
 * Schedule. Dates are calendar dates in Africa/Johannesburg, "YYYY-MM-DD".
 * A Customer has at most one active (not cancelled) Subscription per Product.
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    deliverySchedule: text("delivery_schedule", { enum: deliverySchedules }).notNull(),
    /** The day the Customer subscribed (which Price applies depends on it). */
    subscribedOn: text("subscribed_on").notNull(),
    /**
     * The Product's latest Price change when the Customer subscribed. It places
     * subscribing in the Price history, so a change made later the same day
     * counts as after it.
     */
    priceChangeId: integer("price_change_id")
      .notNull()
      .references(() => priceChanges.id),
    /** The day the current Delivery Schedule runs from: the day of subscribing or of the last switch. */
    scheduleStartsOn: text("schedule_starts_on").notNull(),
    /** The day the next Delivery falls due. */
    nextDueOn: text("next_due_on").notNull(),
    /** The day it was cancelled; null while it is active. */
    cancelledOn: text("cancelled_on"),
  },
  (table) => [
    index("subscriptions_account_id_idx").on(table.accountId),
    index("subscriptions_product_id_idx").on(table.productId),
    uniqueIndex("subscriptions_one_active_per_product")
      .on(table.accountId, table.productId)
      .where(sql`${table.cancelledOn} is null`),
  ],
);

/**
 * A message in one Account's Inbox. Its kind says what it reports (the kinds
 * live in app/modules/notifications); its message is the text the Inbox shows.
 * Unread until the Inbox is opened.
 */
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    // The database stamps it, so no module reads the clock.
    sentAt: integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("notifications_account_id_idx").on(table.accountId)],
);

/**
 * A Product sent to a Customer once under a Subscription. It exists
 * once it has fallen due, and records then the Price it will be charged, in
 * whole cents. Shipped once the Vendor marks it so. A Subscription has at most
 * one Delivery per due date.
 */
export const deliveries = sqliteTable(
  "deliveries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    /** The day it falls due, "YYYY-MM-DD" in Africa/Johannesburg. */
    dueOn: text("due_on").notNull(),
    /** The Price it will be charged, recorded when it fell due. */
    priceCents: integer("price_cents").notNull(),
    /** The day the Vendor marked it shipped; null until then. */
    shippedOn: text("shipped_on"),
  },
  (table) => [uniqueIndex("deliveries_one_per_due_date").on(table.subscriptionId, table.dueOn)],
);

/**
 * What a Customer pays for one shipped Delivery: the Price the Delivery
 * recorded, in whole cents, on the day it was marked shipped. A Delivery has
 * at most one Charge. Charges are simulated: a Charge never fails and is
 * never refunded, and the Vendor earns all of it.
 */
export const charges = sqliteTable("charges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deliveryId: integer("delivery_id")
    .notNull()
    .unique()
    .references(() => deliveries.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  /** The day the Delivery was marked shipped, "YYYY-MM-DD" in Africa/Johannesburg. */
  chargedOn: text("charged_on").notNull(),
});
