// The Marketplace's database schema (Drizzle, SQLite). Name tables and
// columns in GLOSSARY.md's words.
//
// To change it: edit this file, run `npm run db:generate` to write a
// migration into app/db/migrations/, then `npm run db:migrate`. Commit the
// schema change and its migration together.
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

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
