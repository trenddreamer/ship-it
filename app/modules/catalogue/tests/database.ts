// Test fixture: a fresh in-memory Marketplace database (from ~/db/fresh-database), plus helpers to add a Vendor and a Customer to it.
import * as schema from "~/db/schema";
import { setDeliveryAddress, signUpCustomer } from "~/modules/accounts";
import type { CalendarDate } from "~/modules/calendar";
import { subscribe } from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/db/database";

export { freshDatabase } from "~/db/fresh-database";

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

/** Signs a Customer up and subscribes them weekly to a Product on `subscribedOn`. Returns their Account id. */
export async function addSubscribedCustomer(
  database: MarketplaceDatabase,
  email: string,
  productId: number,
  subscribedOn: CalendarDate,
): Promise<number> {
  const customerId = await addCustomer(database, email);
  const subscribed = await subscribe(
    database,
    customerId,
    { productId, deliverySchedule: "weekly" },
    subscribedOn,
  );
  if (!subscribed.ok) throw new Error(`subscribing ${email} failed: ${subscribed.error}`);
  return customerId;
}
