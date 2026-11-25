import { eq } from "drizzle-orm";
import { deliveries, subscriptions } from "~/db/schema";
import { addDays, type CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";
import { dueDateAfter } from "./due-dates";
import { recordedPriceCents } from "./recorded-price";

/**
 * Creates every Delivery of one Subscription that is due on or before `today`
 * and doesn't exist yet, each recording its Price, and moves the
 * Subscription's next due date past them. A cancelled Subscription gets none
 * due after the day it was cancelled. Call it inside a transaction (pass `tx`)
 * so the Subscription can't change halfway.
 */
export async function catchUpSubscription(
  database: DatabaseOrTransaction,
  subscriptionId: number,
  today: CalendarDate,
): Promise<void> {
  const [subscription] = await database
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .all();
  if (!subscription) return;
  const lastDay = today;
  const firstDueOn = addDays(subscription.scheduleStartsOn, 1);
  let dueOn = subscription.nextDueOn;
  while (dueOn <= lastDay) {
    await database
      .insert(deliveries)
      .values({
        subscriptionId,
        dueOn,
        priceCents: await recordedPriceCents(database, subscription, dueOn),
      })
      .onConflictDoNothing()
      .run();
    dueOn = dueDateAfter(subscription.deliverySchedule, firstDueOn, dueOn);
  }
  await database
    .update(subscriptions)
    .set({ nextDueOn: dueOn })
    .where(eq(subscriptions.id, subscriptionId))
    .run();
}
