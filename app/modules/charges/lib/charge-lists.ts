import { desc, eq } from "drizzle-orm";
import { accounts, charges, deliveries, products, subscriptions, vendors } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** A Charge as the Customer who paid it sees it. */
export interface CustomerCharge {
  id: number;
  productName: string;
  vendorName: string;
  /** What was charged, in whole cents. */
  amountCents: number;
  /** The amount formatted for display, e.g. "R 150,00". */
  amount: string;
  /** The day the Delivery was marked shipped. */
  chargedOn: CalendarDate;
}

/** A Customer's Charges, across all their Subscriptions, newest first. */
export async function listCustomerCharges(
  database: MarketplaceDatabase,
  customerId: number,
): Promise<CustomerCharge[]> {
  const rows = await database
    .select({
      id: charges.id,
      productName: products.name,
      vendorName: vendors.name,
      amountCents: charges.amountCents,
      chargedOn: charges.chargedOn,
    })
    .from(charges)
    .innerJoin(deliveries, eq(deliveries.id, charges.deliveryId))
    .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(eq(subscriptions.accountId, customerId))
    .orderBy(desc(charges.chargedOn), desc(charges.id))
    .all();
  return rows.map((charge) => ({ ...charge, amount: formatPrice(charge.amountCents) }));
}

/** A Charge as the Vendor who earned it sees it (the whole amount: no Marketplace fee). */
export interface VendorCharge {
  id: number;
  productName: string;
  customerEmail: string;
  /** What was charged, in whole cents. */
  amountCents: number;
  /** The amount formatted for display, e.g. "R 150,00". */
  amount: string;
  /** The day the Delivery was marked shipped. */
  chargedOn: CalendarDate;
}

/** The Charges for a Vendor's Products, across all their Customers, newest first. */
export async function listVendorCharges(
  database: MarketplaceDatabase,
  vendorId: number,
): Promise<VendorCharge[]> {
  const rows = await database
    .select({
      id: charges.id,
      productName: products.name,
      customerEmail: accounts.email,
      amountCents: charges.amountCents,
      chargedOn: charges.chargedOn,
    })
    .from(charges)
    .innerJoin(deliveries, eq(deliveries.id, charges.deliveryId))
    .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(accounts, eq(accounts.id, subscriptions.accountId))
    .where(eq(products.vendorId, vendorId))
    .orderBy(desc(charges.chargedOn), desc(charges.id))
    .all();
  return rows.map((charge) => ({ ...charge, amount: formatPrice(charge.amountCents) }));
}
