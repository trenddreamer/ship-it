// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, plus a helper to add a Vendor to it.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import type { MarketplaceDatabase } from "~/modules/vendors";

export async function freshDatabase(): Promise<MarketplaceDatabase> {
  const database = drizzle({ client: createClient({ url: ":memory:" }), schema });
  await migrate(database, { migrationsFolder: "app/db/migrations" });
  return database;
}

export async function addVendor(
  database: MarketplaceDatabase,
  name: string,
  approvalStatus: schema.VendorApprovalStatus,
): Promise<number> {
  const vendor = await database
    .insert(schema.vendors)
    .values({ name, approvalStatus })
    .returning({ id: schema.vendors.id })
    .get();
  return vendor.id;
}
