import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { accounts, products, subscriptions, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

/**
 * Which active Subscriptions to cancel. For now one Customer's, by id. When a
 * Vendor stops a Product or a Delivery Schedule (#17), add a variant here,
 * e.g. `{ productId; deliverySchedule? }`, and its case in `matching`.
 */
export type SubscriptionsToEnd = { customerId: number; subscriptionId: number };

/** A Subscription just cancelled, with what a Notification about it needs. */
export interface EndedSubscription {
  id: number;
  customerId: number;
  customerEmail: string;
  productId: number;
  productName: string;
  vendorId: number;
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
      deliverySchedule: subscriptions.deliverySchedule,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
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

function matching(which: SubscriptionsToEnd): SQL | undefined {
  return and(
    eq(subscriptions.id, which.subscriptionId),
    eq(subscriptions.accountId, which.customerId),
  );
}
