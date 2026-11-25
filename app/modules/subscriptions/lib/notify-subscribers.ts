import { and, eq, isNull } from "drizzle-orm";
import { subscriptions } from "~/db/schema";
import {
  sendNotification,
  type DatabaseOrTransaction,
  type NewNotification,
} from "~/modules/notifications";

/**
 * Sends a Notification to every Customer with an active Subscription to a
 * Product. Pass the caller's `tx` so it is sent in the same transaction.
 */
export async function notifySubscribers(
  database: DatabaseOrTransaction,
  productId: number,
  notification: NewNotification,
): Promise<void> {
  const subscribers = await database
    .select({ customerId: subscriptions.accountId })
    .from(subscriptions)
    .where(and(eq(subscriptions.productId, productId), isNull(subscriptions.cancelledOn)))
    .all();
  for (const { customerId } of subscribers) {
    await sendNotification(database, customerId, notification);
  }
}
