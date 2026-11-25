// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, with helpers that add Vendors, Products and Customers through
// the modules that own them.
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import { setDeliveryAddress, signUpCustomer, signUpVendor } from "~/modules/accounts";
import { addProduct, type NewProduct } from "~/modules/catalogue";
import type { MarketplaceDatabase } from "~/db/database";

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

/** Signs a Customer up, with a Delivery Address unless told not to. Returns their Account id. */
export async function addCustomer(
  database: MarketplaceDatabase,
  email: string,
  { withAddress = true } = {},
): Promise<number> {
  const result = await signUpCustomer(database, { email, password: "a-good-password" });
  if (!result.ok) throw new Error(`signing up ${email} failed`);
  if (withAddress) await setDeliveryAddress(database, result.account.id, homeAddress);
  return result.account.id;
}

/** Signs a Vendor up and sets its approval status. Returns its Vendor and Account ids. */
export async function addVendor(
  database: MarketplaceDatabase,
  name: string,
  approvalStatus: schema.VendorApprovalStatus = "approved",
): Promise<{ vendorId: number; accountId: number }> {
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
    .set({ approvalStatus })
    .where(eq(schema.vendors.id, vendorId))
    .run();
  return { vendorId, accountId: result.account.id };
}

/** The day the fixtures add Products: before any day the tests use. */
const productsAddedOn = "2026-01-01";

/** Adds a Product to a Vendor's catalogue. Returns its id. */
export async function addVendorProduct(
  database: MarketplaceDatabase,
  vendorId: number,
  name: string,
  overrides: Partial<NewProduct> = {},
): Promise<number> {
  const product = await addProduct(
    database,
    vendorId,
    {
      name,
      description: `${name}, delivered.`,
      priceCents: 15000,
      deliverySchedules: ["weekly", "monthly"],
      ...overrides,
    },
    productsAddedOn,
  );
  return product.id;
}
