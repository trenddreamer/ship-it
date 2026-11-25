import { and, asc, eq, isNull } from "drizzle-orm";
import { accounts, products, subscriptions, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { MarketplaceDatabase } from "~/db/database";

/** An active Subscription to one of a Vendor's Products, as the Vendor sees it. */
export interface VendorSubscription {
  id: number;
  customerEmail: string;
  deliverySchedule: DeliverySchedule;
  subscribedOn: CalendarDate;
  /** The day the next Delivery is due. */
  nextDueOn: CalendarDate;
}

/** One of a Vendor's Products and its active Subscriptions. */
export interface ProductSubscriptions {
  productId: number;
  productName: string;
  /** Oldest first. */
  subscriptions: VendorSubscription[];
}

/**
 * Every Product of one Vendor, ordered by name, each with its active
 * Subscriptions (an empty list when it has none).
 */
export async function listVendorSubscriptions(
  database: MarketplaceDatabase,
  vendorId: number,
): Promise<ProductSubscriptions[]> {
  const vendorProducts = await database
    .select({ productId: products.id, productName: products.name })
    .from(products)
    .where(eq(products.vendorId, vendorId))
    .orderBy(asc(products.name), asc(products.id))
    .all();
  const rows = await database
    .select({
      productId: subscriptions.productId,
      id: subscriptions.id,
      customerEmail: accounts.email,
      deliverySchedule: subscriptions.deliverySchedule,
      subscribedOn: subscriptions.subscribedOn,
      nextDueOn: subscriptions.nextDueOn,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(accounts, eq(accounts.id, subscriptions.accountId))
    .where(and(eq(products.vendorId, vendorId), isNull(subscriptions.cancelledOn)))
    .orderBy(asc(subscriptions.id))
    .all();
  return vendorProducts.map((product) => ({
    ...product,
    subscriptions: rows
      .filter((row) => row.productId === product.productId)
      .map(({ productId: _, ...subscription }) => subscription),
  }));
}
