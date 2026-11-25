import type { CalendarDate } from "~/modules/calendar";
import type { MarketplaceDatabase } from "~/db/database";
import { endSubscriptions } from "./end-subscriptions";
import { notifyVendor } from "./notify-vendor";

export type CancelResult = { ok: true } | { ok: false; error: CancelRefusal };

/** Why cancelling was refused: the Subscription isn't the Customer's, or isn't active. */
export type CancelRefusal = "subscription-not-found";

/**
 * A Customer cancels one of their active Subscriptions, as of `today`. No new
 * Deliveries fall due after it; it then shows as cancelled, with no next due
 * date, and the Customer may subscribe to the Product again. The Vendor is
 * notified in the same transaction.
 */
export async function cancelSubscription(
  database: MarketplaceDatabase,
  customerId: number,
  subscriptionId: number,
  today: CalendarDate,
): Promise<CancelResult> {
  const ended = await database.transaction(async (tx) => {
    const cancelled = await endSubscriptions(tx, { customerId, subscriptionId }, today);
    for (const subscription of cancelled) {
      await notifyVendor(tx, subscription.vendorId, {
        kind: "subscription-cancelled",
        customerEmail: subscription.customerEmail,
        productName: subscription.productName,
      });
    }
    return cancelled;
  });
  return ended.length > 0 ? { ok: true } : { ok: false, error: "subscription-not-found" };
}
