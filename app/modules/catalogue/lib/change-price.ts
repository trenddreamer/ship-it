import { and, eq, isNull } from "drizzle-orm";
import { priceChanges, products, vendors } from "~/db/schema";
import { addDays, formatCalendarDate, type CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import { notifySubscribedCustomers } from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/db/database";

/** How long Customers already subscribed keep the old Price after a change. */
const noticePeriodDays = 7;

/** A new Price for one of the Vendor's Products. */
export interface PriceChange {
  productId: number;
  /** The new Price per Delivery, in whole cents. */
  priceCents: number;
}

export type ChangePriceResult =
  { ok: true; takesEffectOn: CalendarDate } | { ok: false; error: ChangePriceRefusal };

/** Why a Price change was refused. */
export type ChangePriceRefusal = "product-not-found" | "same-price";

/**
 * Changes the Price of one of the Vendor's Products, `today`. New
 * Subscriptions and the home page get it at once; the change is kept in the
 * Product's Price history, and it takes effect for existing Subscriptions 7
 * days later (the Notice Period). Refused for a Product that isn't the
 * Vendor's or that it stopped selling, and for the Price it already has.
 * Every Customer with an active Subscription to the Product is notified in
 * the same transaction.
 */
export async function changePrice(
  database: MarketplaceDatabase,
  vendorId: number,
  change: PriceChange,
  today: CalendarDate,
): Promise<ChangePriceResult> {
  return database.transaction(async (tx): Promise<ChangePriceResult> => {
    const [product] = await tx
      .select({ name: products.name, priceCents: products.priceCents, vendorName: vendors.name })
      .from(products)
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
      .where(
        and(
          eq(products.id, change.productId),
          eq(products.vendorId, vendorId),
          isNull(products.stoppedOn),
        ),
      )
      .all();
    if (!product) return { ok: false, error: "product-not-found" };
    if (product.priceCents === change.priceCents) return { ok: false, error: "same-price" };
    await tx
      .update(products)
      .set({ priceCents: change.priceCents })
      .where(eq(products.id, change.productId))
      .run();
    await tx
      .insert(priceChanges)
      .values({ productId: change.productId, priceCents: change.priceCents, changedOn: today })
      .run();
    const takesEffectOn = addDays(today, noticePeriodDays);
    await notifySubscribedCustomers(tx, change.productId, {
      kind: "price-changed",
      vendorName: product.vendorName,
      productName: product.name,
      oldPrice: formatPrice(product.priceCents),
      newPrice: formatPrice(change.priceCents),
      takesEffectOn: formatCalendarDate(takesEffectOn),
    });
    return { ok: true, takesEffectOn };
  });
}
