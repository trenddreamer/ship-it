import { lte } from "drizzle-orm";
import { subscriptions } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { catchUpSubscription } from "./catch-up";

/**
 * The daily job: creates every Delivery, for every Subscription, that is due
 * on or before `today` and doesn't exist yet. Each records the Price it will
 * be charged. Running it twice creates nothing new; after missed days it
 * catches up, so a Delivery can be late but is never lost. A cancelled
 * Subscription gets no Delivery due after its cancellation, but those due on
 * or before it still stand.
 */
export async function createDueDeliveries(
  database: MarketplaceDatabase,
  today: CalendarDate,
): Promise<void> {
  const due = await database
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(lte(subscriptions.nextDueOn, today))
    .all();
  for (const { id } of due) {
    await database.transaction((tx) => catchUpSubscription(tx, id, today));
  }
}
