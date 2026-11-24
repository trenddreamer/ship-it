// Test fixture: a fresh in-memory Marketplace database, migrated like the
// real one, plus small helpers to add Vendors and Products to it.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../../../db/schema";
import type { MarketplaceDatabase } from "../index";

export function freshDatabase(): MarketplaceDatabase {
  const database = drizzle({ client: new Database(":memory:"), schema });
  migrate(database, { migrationsFolder: "app/db/migrations" });
  return database;
}

export function addVendor(
  database: MarketplaceDatabase,
  name: string,
  approvalStatus: schema.VendorApprovalStatus,
): number {
  const vendor = database
    .insert(schema.vendors)
    .values({ name, approvalStatus, description: `${name} description` })
    .returning({ id: schema.vendors.id })
    .get();
  return vendor.id;
}

export function addProduct(
  database: MarketplaceDatabase,
  vendorId: number,
  name: string,
  priceCents: number,
): void {
  database
    .insert(schema.products)
    .values({ vendorId, name, priceCents, description: `${name} description` })
    .run();
}
