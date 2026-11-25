import { and, asc, eq, isNull } from "drizzle-orm";
import { products, subscriptions, vendors, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** One of a Customer's active Subscriptions, as they see it. */
export interface CustomerSubscription {
  id: number;
  productName: string;
  vendorName: string;
  deliverySchedule: DeliverySchedule;
  /** The Product's Price per Delivery, in whole cents. */
  priceCents: number;
  /** The Price formatted for display, e.g. "R 150,00". */
  price: string;
  /** The day the next Delivery is due. */
  nextDueOn: CalendarDate;
}

/**
 * A Customer's active Subscriptions, ordered by Product name, each with its
 * Product, Vendor, Delivery Schedule, Price and next due date.
 */
export async function listCustomerSubscriptions(
  database: MarketplaceDatabase,
  customerId: number,
): Promise<CustomerSubscription[]> {
  const rows = await database
    .select({
      id: subscriptions.id,
      productName: products.name,
      vendorName: vendors.name,
      deliverySchedule: subscriptions.deliverySchedule,
      priceCents: products.priceCents,
      nextDueOn: subscriptions.nextDueOn,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(and(eq(subscriptions.accountId, customerId), isNull(subscriptions.cancelledOn)))
    .orderBy(asc(products.name), asc(subscriptions.id))
    .all();
  return rows.map((row) => ({ ...row, price: formatPrice(row.priceCents) }));
}
