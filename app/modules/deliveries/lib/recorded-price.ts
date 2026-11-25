import { eq } from "drizzle-orm";
import { products } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

/** What the recorded Price depends on: the Subscription's Product, and when it began. */
export interface PricedSubscription {
  productId: number;
  subscribedOn: CalendarDate;
}

/**
 * The Price, in whole cents, a Delivery of this Subscription due on `dueOn`
 * records when it falls due. The one place that decides it. For now it is the
 * Product's current Price; once Prices have a history (#16) it becomes the
 * Price as it stood 7 days before `dueOn`, or on `subscribedOn` if later.
 */
export async function recordedPriceCents(
  database: DatabaseOrTransaction,
  subscription: PricedSubscription,
  _dueOn: CalendarDate,
): Promise<number> {
  const [product] = await database
    .select({ priceCents: products.priceCents })
    .from(products)
    .where(eq(products.id, subscription.productId))
    .all();
  // A Subscription's Product exists: deleting one deletes its Subscriptions.
  return product!.priceCents;
}
