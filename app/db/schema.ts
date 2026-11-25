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

/** A physical good a Vendor sells. Price is per Delivery, in whole cents. */
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
  },
  (table) => [index("products_vendor_id_idx").on(table.vendorId)],
);

/** How often a Product is delivered under a Subscription. A fixed set. */
export const deliverySchedules = ["weekly", "every-two-weeks", "monthly"] as const;
export type DeliverySchedule = (typeof deliverySchedules)[number];

/**
 * A Delivery Schedule a Product offers: one row per schedule, and a Product
 * offers at least one (the catalogue module enforces that when it adds one).
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
    sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("notifications_account_id_idx").on(table.accountId)],
);
