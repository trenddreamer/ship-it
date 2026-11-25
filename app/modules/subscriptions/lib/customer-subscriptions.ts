import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  deliverySchedules,
  productDeliverySchedules,
  products,
  subscriptions,
  vendors,
  type DeliverySchedule,
} from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/db/database";

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
  /**
   * The other Delivery Schedules its Product offers, in the fixed order, that
   * the Customer can switch to. Empty once cancelled.
   */
  switchTo: DeliverySchedule[];
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
      productId: subscriptions.productId,
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
  const offered = await database
    .select({
      productId: productDeliverySchedules.productId,
      deliverySchedule: productDeliverySchedules.deliverySchedule,
    })
    .from(productDeliverySchedules)
    .where(
      inArray(
        productDeliverySchedules.productId,
        rows.map((row) => row.productId),
      ),
    )
    .all();
  return rows.map(({ productId, ...row }) => {
    const active = row.cancelledOn === null;
    const offeredHere = new Set(
      offered.filter((o) => o.productId === productId).map((o) => o.deliverySchedule),
    );
    return {
      ...row,
      nextDueOn: active ? row.nextDueOn : null,
      price: formatPrice(row.priceCents),
      switchTo: active
        ? deliverySchedules.filter((s) => s !== row.deliverySchedule && offeredHere.has(s))
        : [],
    };
  });
}
