import { and, desc, eq, lte, or } from "drizzle-orm";
import { priceChanges } from "~/db/schema";
import { addDays, type CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

/** What the recorded Price depends on: the Subscription's Product, and when it began. */
export interface PricedSubscription {
  productId: number;
  /** The Product's latest Price change when the Customer subscribed. */
  priceChangeId: number;
}

/** How many days before a Delivery's due date its Price is taken: the Notice Period. */
const noticePeriodDays = 7;

/**
 * The Price, in whole cents, a Delivery of this Subscription due on `dueOn`
 * records when it falls due. The one place that decides it, with one rule:
 * the Product's Price as it stood 7 days before `dueOn` (at the end of that
 * day), or as it stood when the Customer subscribed, if that was later.
 *
 * The Price history is in order by id, so the Price as it stood at the later
 * of the two moments is the last change made before either of them: the last
 * change dated on or before `dueOn - 7`, or up to the one the Customer
 * subscribed under. That also orders subscribing and changes made on the
 * same day.
 */
export async function recordedPriceCents(
  database: DatabaseOrTransaction,
  subscription: PricedSubscription,
  dueOn: CalendarDate,
): Promise<number> {
  const [price] = await database
    .select({ priceCents: priceChanges.priceCents })
    .from(priceChanges)
    .where(
      and(
        eq(priceChanges.productId, subscription.productId),
        or(
          lte(priceChanges.changedOn, addDays(dueOn, -noticePeriodDays)),
          lte(priceChanges.id, subscription.priceChangeId),
        ),
      ),
    )
    .orderBy(desc(priceChanges.id))
    .limit(1)
    .all();
  // The change the Customer subscribed under always matches.
  return price!.priceCents;
}
