import { asc, eq, and, isNull } from "drizzle-orm";
import { accounts, deliveries, deliveryAddresses, products, subscriptions } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** A Delivery that has fallen due and isn't shipped yet, as its Vendor sees it. */
export interface DueDelivery {
  id: number;
  dueOn: CalendarDate;
  productName: string;
  customerEmail: string;
  /** Where to send it: the Customer's Delivery Address as it is now. */
  deliveryAddress: { street: string; suburb: string; city: string; postalCode: string };
  /** The Price it records, in whole cents. */
  priceCents: number;
  /** The Price formatted for display, e.g. "R 150,00". */
  price: string;
}

/**
 * A Vendor's Deliveries that have fallen due and aren't shipped yet, across
 * all their Products, oldest due date first.
 */
export async function listVendorDueDeliveries(
  database: MarketplaceDatabase,
  vendorId: number,
): Promise<DueDelivery[]> {
  const rows = await database
    .select({
      id: deliveries.id,
      dueOn: deliveries.dueOn,
      productName: products.name,
      customerEmail: accounts.email,
      street: deliveryAddresses.street,
      suburb: deliveryAddresses.suburb,
      city: deliveryAddresses.city,
      postalCode: deliveryAddresses.postalCode,
      priceCents: deliveries.priceCents,
    })
    .from(deliveries)
    .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(accounts, eq(accounts.id, subscriptions.accountId))
    // A Customer can't subscribe without a Delivery Address, nor remove it.
    .innerJoin(deliveryAddresses, eq(deliveryAddresses.accountId, subscriptions.accountId))
    .where(and(eq(products.vendorId, vendorId), isNull(deliveries.shippedOn)))
    .orderBy(asc(deliveries.dueOn), asc(deliveries.id))
    .all();
  return rows.map(({ street, suburb, city, postalCode, ...delivery }) => ({
    ...delivery,
    deliveryAddress: { street, suburb, city, postalCode },
    price: formatPrice(delivery.priceCents),
  }));
}
