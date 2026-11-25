import { and, desc, eq, isNull } from "drizzle-orm";
import { priceChanges, subscriptions, type DeliverySchedule } from "~/db/schema";
import { findAccount, findDeliveryAddress } from "~/modules/accounts";
import { addDays, type CalendarDate } from "~/modules/calendar";
import { deliveryScheduleOptions } from "~/modules/catalogue";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { notifyVendor } from "./notify-vendor";
import { findSubscribableProduct } from "./subscribable-product";

/** What a Customer picks when they subscribe. */
export interface NewSubscription {
  productId: number;
  deliverySchedule: DeliverySchedule;
}

export type SubscribeResult = { ok: true } | { ok: false; error: SubscribeRefusal };

/** Why subscribing was refused. */
export type SubscribeRefusal =
  "no-delivery-address" | "product-not-found" | "schedule-not-offered" | "already-subscribed";

const scheduleLabels = new Map(deliveryScheduleOptions.map((o) => [o.value, o.label]));

/**
 * Subscribes a Customer to a Product on one of its Delivery Schedules. The
 * first Delivery is due the day after `today`. Refused, creating nothing,
 * when the Customer has no Delivery Address, when Customers can't see the
 * Product, when it doesn't offer the Delivery Schedule, or when the Customer
 * already has an active Subscription to it. The Vendor is notified in the
 * same transaction.
 */
export async function subscribe(
  database: MarketplaceDatabase,
  customerId: number,
  pick: NewSubscription,
  today: CalendarDate,
): Promise<SubscribeResult> {
  if (!(await findDeliveryAddress(database, customerId))) {
    return { ok: false, error: "no-delivery-address" };
  }
  const product = await findSubscribableProduct(database, pick.productId);
  if (!product) return { ok: false, error: "product-not-found" };
  if (!product.deliverySchedules.includes(pick.deliverySchedule)) {
    return { ok: false, error: "schedule-not-offered" };
  }
  if (await hasActiveSubscription(database, customerId, product.id)) {
    return { ok: false, error: "already-subscribed" };
  }
  const customer = await findAccount(database, customerId);
  await database.transaction(async (tx) => {
    // Where subscribing falls in the Price history: after the latest change.
    const [latest] = await tx
      .select({ id: priceChanges.id })
      .from(priceChanges)
      .where(eq(priceChanges.productId, product.id))
      .orderBy(desc(priceChanges.id))
      .limit(1)
      .all();
    await tx
      .insert(subscriptions)
      .values({
        accountId: customerId,
        productId: product.id,
        deliverySchedule: pick.deliverySchedule,
        subscribedOn: today,
        // Every Product has a Price history from the day it was added.
        priceChangeId: latest!.id,
        scheduleStartsOn: today,
        nextDueOn: addDays(today, 1),
      })
      .run();
    await notifyVendor(tx, product.vendorId, {
      kind: "new-subscription",
      // A Customer who has a Delivery Address has an Account.
      customerEmail: customer!.email,
      productName: product.name,
      scheduleLabel: scheduleLabels.get(pick.deliverySchedule)!,
    });
  });
  return { ok: true };
}

async function hasActiveSubscription(
  database: MarketplaceDatabase,
  customerId: number,
  productId: number,
): Promise<boolean> {
  const active = await database
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.accountId, customerId),
        eq(subscriptions.productId, productId),
        isNull(subscriptions.cancelledOn),
      ),
    )
    .all();
  return active.length > 0;
}
