// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, plus helpers to add a Vendor and a Customer to it.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import { setDeliveryAddress, signUpCustomer } from "~/modules/accounts";
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

/** Signs a Customer up with a Delivery Address, ready to subscribe. Returns their Account id. */
export async function addCustomer(database: MarketplaceDatabase, email: string): Promise<number> {
  const result = await signUpCustomer(database, { email, password: "a-good-password" });
  if (!result.ok) throw new Error(`signing up ${email} failed`);
  await setDeliveryAddress(database, result.account.id, {
    street: "12 Long Street",
    suburb: "Gardens",
    city: "Cape Town",
    postalCode: "8001",
  });
  return result.account.id;
}
