import { eq } from "drizzle-orm";
import { productDeliverySchedules, subscriptions, type DeliverySchedule } from "~/db/schema";
import { addDays, type CalendarDate } from "~/modules/calendar";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { findActiveSubscription } from "./active-subscription";

/** Which Subscription to switch, and the Delivery Schedule to switch it to. */
export interface ScheduleSwitch {
  subscriptionId: number;
  deliverySchedule: DeliverySchedule;
}

export type SwitchResult = { ok: true } | { ok: false; error: SwitchRefusal };

/** Why switching was refused. */
export type SwitchRefusal = "subscription-not-found" | "schedule-not-offered" | "same-schedule";

/**
 * Switches one of a Customer's active Subscriptions to another Delivery
 * Schedule its Product offers. The new schedule runs from `today`: the next
 * Delivery is due the day after. Refused, changing nothing, when the
 * Subscription isn't the Customer's or isn't active, when the Product doesn't
 * offer the schedule, or when the Subscription is already on it.
 */
export async function switchDeliverySchedule(
  database: MarketplaceDatabase,
  customerId: number,
  { subscriptionId, deliverySchedule }: ScheduleSwitch,
  today: CalendarDate,
): Promise<SwitchResult> {
  const subscription = await findActiveSubscription(database, customerId, subscriptionId);
  if (!subscription) return { ok: false, error: "subscription-not-found" };
  if (subscription.deliverySchedule === deliverySchedule) {
    return { ok: false, error: "same-schedule" };
  }
  const offered = await database
    .select({ deliverySchedule: productDeliverySchedules.deliverySchedule })
    .from(productDeliverySchedules)
    .where(eq(productDeliverySchedules.productId, subscription.productId))
    .all();
  if (!offered.some((o) => o.deliverySchedule === deliverySchedule)) {
    return { ok: false, error: "schedule-not-offered" };
  }
  await database
    .update(subscriptions)
    .set({ deliverySchedule, scheduleStartsOn: today, nextDueOn: addDays(today, 1) })
    .where(eq(subscriptions.id, subscription.id))
    .run();
  return { ok: true };
}
