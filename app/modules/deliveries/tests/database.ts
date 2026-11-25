// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, with helpers that add Vendors, Products, Customers and
// Subscriptions through the modules that own them.
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import { setDeliveryAddress, signUpCustomer, signUpVendor } from "~/modules/accounts";
import type { CalendarDate } from "~/modules/calendar";
import { addProduct, type NewProduct } from "~/modules/catalogue";
import { listCustomerSubscriptions, subscribe } from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/modules/vendors";

export async function freshDatabase(): Promise<MarketplaceDatabase> {
  const database = drizzle({ client: createClient({ url: ":memory:" }), schema });
  await migrate(database, { migrationsFolder: "app/db/migrations" });
  return database;
}

export const homeAddress = {
  street: "12 Long Street",
  suburb: "Gardens",
  city: "Cape Town",
  postalCode: "8001",
};

/** Signs a Customer up with a Delivery Address. Returns their Account id. */
export async function addCustomer(
  database: MarketplaceDatabase,
  email: string,
  address = homeAddress,
): Promise<number> {
  const result = await signUpCustomer(database, { email, password: "a-good-password" });
  if (!result.ok) throw new Error(`signing up ${email} failed`);
  await setDeliveryAddress(database, result.account.id, address);
  return result.account.id;
}

/** Signs an approved Vendor up. Returns its Vendor id. */
export async function addVendor(database: MarketplaceDatabase, name: string): Promise<number> {
  const email = `${name.toLowerCase().replaceAll(/\W+/g, "-")}@example.test`;
  const result = await signUpVendor(database, {
    email,
    password: "a-good-password",
    businessName: name,
    description: `${name} sells things.`,
  });
  if (!result.ok || result.account.kind !== "vendor") throw new Error(`signing up ${name} failed`);
  const vendorId = result.account.vendorId;
  await database
    .update(schema.vendors)
    .set({ approvalStatus: "approved" })
    .where(eq(schema.vendors.id, vendorId))
    .run();
  return vendorId;
}

/** Adds a Product offering every Delivery Schedule. Returns its id. */
export async function addVendorProduct(
  database: MarketplaceDatabase,
  vendorId: number,
  name: string,
  overrides: Partial<NewProduct> = {},
): Promise<number> {
  const product = await addProduct(database, vendorId, {
    name,
    description: `${name}, delivered.`,
    priceCents: 15000,
    deliverySchedules: ["weekly", "every-two-weeks", "monthly"],
    ...overrides,
  });
  return product.id;
}

/**
 * Changes a Product's Price in place. No module changes a Price yet (#16
 * will); until then this stands in for it.
 */
export async function setPrice(
  database: MarketplaceDatabase,
  productId: number,
  priceCents: number,
): Promise<void> {
  await database
    .update(schema.products)
    .set({ priceCents })
    .where(eq(schema.products.id, productId))
    .run();
}

/**
 * Marks a Delivery shipped in place. No module ships Deliveries yet (#15
 * will); until then this stands in for it.
 */
export async function markShipped(
  database: MarketplaceDatabase,
  deliveryId: number,
  shippedOn: CalendarDate,
): Promise<void> {
  await database
    .update(schema.deliveries)
    .set({ shippedOn })
    .where(eq(schema.deliveries.id, deliveryId))
    .run();
}

/** Subscribes a Customer to a Product on `subscribedOn`. Returns the Subscription's id. */
export async function addSubscription(
  database: MarketplaceDatabase,
  customerId: number,
  productId: number,
  deliverySchedule: schema.DeliverySchedule,
  subscribedOn: CalendarDate,
): Promise<number> {
  const result = await subscribe(
    database,
    customerId,
    { productId, deliverySchedule },
    subscribedOn,
  );
  if (!result.ok) throw new Error(`subscribing failed: ${result.error}`);
  // The newest Subscription is the one just made.
  const all = await listCustomerSubscriptions(database, customerId);
  return Math.max(...all.map((s) => s.id));
}
