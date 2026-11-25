import { and, eq, isNull } from "drizzle-orm";
import { subscriptions, type DeliverySchedule } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

/** An active Subscription, as the module needs it to change it. */
export interface ActiveSubscription {
  id: number;
  productId: number;
  deliverySchedule: DeliverySchedule;
}

/** The Customer's active Subscription with this id, or null if it isn't theirs or is cancelled. */
export async function findActiveSubscription(
  database: MarketplaceDatabase,
  customerId: number,
  subscriptionId: number,
): Promise<ActiveSubscription | null> {
  const row = await database
    .select({
      id: subscriptions.id,
      productId: subscriptions.productId,
      deliverySchedule: subscriptions.deliverySchedule,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.accountId, customerId),
        isNull(subscriptions.cancelledOn),
      ),
    )
    .get();
  return row ?? null;
}
