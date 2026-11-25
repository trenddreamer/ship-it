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
