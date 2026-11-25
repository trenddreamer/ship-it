import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { accounts, products, subscriptions, vendors, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

/**
 * Which active Subscriptions to cancel: one Customer's, by id; or every one
 * to a Product a Vendor stopped (see `VendorStop`).
 */
export type SubscriptionsToEnd = { customerId: number; subscriptionId: number } | VendorStop;

/**
 * What a Vendor stops: one of its Products, or one Delivery Schedule of it.
 * A null `deliverySchedule` means the whole Product.
 */
export interface VendorStop {
  productId: number;
  deliverySchedule: DeliverySchedule | null;
}

/** A Subscription just cancelled, with what a Notification about it needs. */
export interface EndedSubscription {
  id: number;
  customerId: number;
  customerEmail: string;
  productId: number;
  productName: string;
  vendorId: number;
  vendorName: string;
  deliverySchedule: DeliverySchedule;
}

/**
 * Cancels the matching active Subscriptions as of `today`: no new Deliveries
 * fall due after it, and the Customer may subscribe to the Product again.
 * Already-cancelled ones are left alone. Sends no Notification: the caller
 * decides who hears about it and how, inside the same transaction (pass `tx`).
 * Returns the Subscriptions it cancelled.
 */
export async function endSubscriptions(
  database: DatabaseOrTransaction,
  which: SubscriptionsToEnd,
  today: CalendarDate,
): Promise<EndedSubscription[]> {
  const ended = await database
    .update(subscriptions)
    .set({ cancelledOn: today })
    .where(and(isNull(subscriptions.cancelledOn), matching(which)))
    .returning({ id: subscriptions.id })
    .all();
  return database
    .select({
      id: subscriptions.id,
      customerId: subscriptions.accountId,
      customerEmail: accounts.email,
      productId: subscriptions.productId,
      productName: products.name,
      vendorId: products.vendorId,
      vendorName: vendors.name,
      deliverySchedule: subscriptions.deliverySchedule,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .innerJoin(accounts, eq(accounts.id, subscriptions.accountId))
    .where(
      inArray(
        subscriptions.id,
        ended.map((e) => e.id),
      ),
    )
    .orderBy(subscriptions.id)
    .all();
}

/** The condition that picks out these Subscriptions, active or not. */
export function matching(which: SubscriptionsToEnd): SQL | undefined {
  if ("productId" in which) {
    return and(
      eq(subscriptions.productId, which.productId),
      which.deliverySchedule === null
        ? undefined
        : eq(subscriptions.deliverySchedule, which.deliverySchedule),
    );
  }
  return and(
    eq(subscriptions.id, which.subscriptionId),
    eq(subscriptions.accountId, which.customerId),
  );
}
