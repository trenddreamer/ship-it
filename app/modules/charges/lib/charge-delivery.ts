import { eq } from "drizzle-orm";
import { charges, deliveries } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

/** The Charge just made for a shipped Delivery. */
export interface NewCharge {
  /** What was charged, in whole cents: the Price the Delivery recorded. */
  amountCents: number;
}

/**
 * Charges the Customer for a Delivery just marked shipped: the Price the
 * Delivery recorded when it fell due, dated `shippedOn`. Call it inside the
 * transaction that marks the Delivery shipped (pass `tx`). A Delivery can't
 * be charged twice: a second call throws, rolling that transaction back.
 */
export async function chargeDelivery(
  database: DatabaseOrTransaction,
  deliveryId: number,
  shippedOn: CalendarDate,
): Promise<NewCharge> {
  const [delivery] = await database
    .select({ priceCents: deliveries.priceCents })
    .from(deliveries)
    .where(eq(deliveries.id, deliveryId))
    .all();
  if (!delivery) throw new Error(`Delivery ${deliveryId} doesn't exist.`);
  const charge = { amountCents: delivery.priceCents };
  await database
    .insert(charges)
    .values({ deliveryId, chargedOn: shippedOn, ...charge })
    .run();
  return charge;
}
