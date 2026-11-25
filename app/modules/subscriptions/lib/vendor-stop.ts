import type { CalendarDate } from "~/modules/calendar";
import { deliveryScheduleOptions } from "~/modules/deliveries";
import { sendNotification, type DatabaseOrTransaction } from "~/modules/notifications";
import { endSubscriptions, type VendorStop } from "./end-subscriptions";

const scheduleLabels = new Map(deliveryScheduleOptions.map((o) => [o.value, o.label]));

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
            scheduleLabel: scheduleLabels.get(stop.deliverySchedule)!,
          },
    );
  }
  return ended.length;
}
