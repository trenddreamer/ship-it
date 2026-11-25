import { asc, desc, eq, sql } from "drizzle-orm";
import { products, subscriptions, vendors, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** One of a Customer's Subscriptions, active or cancelled, as they see it. */
export interface CustomerSubscription {
  id: number;
  productName: string;
  vendorName: string;
  deliverySchedule: DeliverySchedule;
  /** The Product's Price per Delivery, in whole cents. */
  priceCents: number;
  /** The Price formatted for display, e.g. "R 150,00". */
  price: string;
  /** The day the next Delivery is due; null once cancelled. */
  nextDueOn: CalendarDate | null;
  /** The day it was cancelled; null while it is active. */
  cancelledOn: CalendarDate | null;
}

/**
 * A Customer's Subscriptions, each with its Product, Vendor, Delivery
 * Schedule, Price, and next due date or cancellation date. Active ones come
 * first, by Product name; then cancelled ones, most recently cancelled first.
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
      cancelledOn: subscriptions.cancelledOn,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(eq(subscriptions.accountId, customerId))
    .orderBy(
      sql`${subscriptions.cancelledOn} is not null`,
      desc(subscriptions.cancelledOn),
      asc(products.name),
      desc(subscriptions.id),
    )
    .all();
  return rows.map((row) => ({
    ...row,
    nextDueOn: row.cancelledOn === null ? row.nextDueOn : null,
    price: formatPrice(row.priceCents),
  }));
}
