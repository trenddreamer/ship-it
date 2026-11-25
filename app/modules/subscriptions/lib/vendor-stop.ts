import { and, count, isNull } from "drizzle-orm";
import { subscriptions } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { deliveryScheduleLabel } from "~/modules/deliveries";
import { sendNotification, type DatabaseOrTransaction } from "~/modules/notifications";
import { endSubscriptions, matching, type VendorStop } from "./end-subscriptions";

/**
 * Cancels every active Subscription a Vendor's stop affects, as of `today`:
 * all of them to the Product, or only those on the stopped Delivery Schedule.
 * Each Customer is told the Vendor cancelled it, and why. Deliveries already
 * due still stand; none fall due after `today`. Run it inside the transaction
 * that records the stop (pass `tx`). Returns how many it cancelled.
 */
export async function cancelForVendorStop(
  database: DatabaseOrTransaction,
  stop: VendorStop,
  today: CalendarDate,
): Promise<number> {
  const ended = await endSubscriptions(database, stop, today);
  for (const subscription of ended) {
    const about = { vendorName: subscription.vendorName, productName: subscription.productName };
    await sendNotification(
      database,
      subscription.customerId,
      stop.deliverySchedule === null
        ? { kind: "product-stopped", ...about }
        : {
            kind: "delivery-schedule-stopped",
            ...about,
            scheduleLabel: deliveryScheduleLabel(stop.deliverySchedule),
          },
    );
  }
  return ended.length;
}

/** How many active Subscriptions a Vendor's stop would cancel, for its warning. */
export async function countActiveSubscriptions(
  database: DatabaseOrTransaction,
  stop: VendorStop,
): Promise<number> {
  const row = await database
    .select({ active: count() })
    .from(subscriptions)
    .where(and(isNull(subscriptions.cancelledOn), matching(stop)))
    .get();
  return row!.active;
}
