import { eq } from "drizzle-orm";
import { charges, deliveries } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";

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
): Promise<void> {
  const [delivery] = await database
    .select({ priceCents: deliveries.priceCents })
    .from(deliveries)
    .where(eq(deliveries.id, deliveryId))
    .all();
  if (!delivery) throw new Error(`Delivery ${deliveryId} doesn't exist.`);
  await database
    .insert(charges)
    .values({ deliveryId, amountCents: delivery.priceCents, chargedOn: shippedOn })
    .run();
}
