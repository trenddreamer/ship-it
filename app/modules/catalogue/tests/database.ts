// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, plus helpers to add Vendors and subscribed Customers to it.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import { setDeliveryAddress, signUpCustomer } from "~/modules/accounts";
import type { CalendarDate } from "~/modules/calendar";
import { subscribe } from "~/modules/subscriptions";
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

/**
 * Signs a Customer up, with a Delivery Address, and subscribes them weekly
 * to a Product on `subscribedOn`. Returns their Account id.
 */
export async function addSubscriber(
  database: MarketplaceDatabase,
  email: string,
  productId: number,
  subscribedOn: CalendarDate,
): Promise<number> {
  const signedUp = await signUpCustomer(database, { email, password: "a-good-password" });
  if (!signedUp.ok) throw new Error(`signing up ${email} failed`);
  const customerId = signedUp.account.id;
  await setDeliveryAddress(database, customerId, {
    street: "12 Long Street",
    suburb: "Gardens",
    city: "Cape Town",
    postalCode: "8001",
  });
  const subscribed = await subscribe(
    database,
    customerId,
    { productId, deliverySchedule: "weekly" },
    subscribedOn,
  );
  if (!subscribed.ok) throw new Error(`subscribing ${email} failed: ${subscribed.error}`);
  return customerId;
}
