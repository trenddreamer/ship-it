import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  deliverySchedules,
  priceChanges,
  productDeliverySchedules,
  products,
  type DeliverySchedule,
} from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** A Product to add: it offers at least one Delivery Schedule. */
export interface NewProduct {
  name: string;
  description: string;
  /** Price per Delivery, in whole cents. */
  priceCents: number;
  deliverySchedules: readonly [DeliverySchedule, ...DeliverySchedule[]];
}

/** A Product as its Vendor sees it in the catalogue. */
export interface CatalogueProduct {
  id: number;
  name: string;
  description: string;
  /** Price per Delivery, in whole cents. */
  priceCents: number;
  /** Price per Delivery formatted for display, e.g. "R 150,00". */
  price: string;
  /** The Delivery Schedules it offers, in the fixed order: weekly, every two weeks, monthly. */
  deliverySchedules: DeliverySchedule[];
}

/**
 * Adds a Product to a Vendor's catalogue, with the Delivery Schedules it
 * offers. Whether the Vendor is approved doesn't matter: Customers only see
 * an approved Vendor's Products, so a pending Vendor's stay hidden until then.
 * Its Price history starts `today`.
 */
export async function addProduct(
  database: MarketplaceDatabase,
  vendorId: number,
  product: NewProduct,
  today: CalendarDate,
): Promise<CatalogueProduct> {
  const offered = inScheduleOrder(product.deliverySchedules);
  const id = await database.transaction(async (tx) => {
    const row = await tx
      .insert(products)
      .values({
        vendorId,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
      })
      .returning({ id: products.id })
      .get();
    await tx
      .insert(productDeliverySchedules)
      .values(offered.map((deliverySchedule) => ({ productId: row.id, deliverySchedule })))
      .run();
    await tx
      .insert(priceChanges)
      .values({ productId: row.id, priceCents: product.priceCents, changedOn: today })
      .run();
    return row.id;
  });
  return {
    id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    price: formatPrice(product.priceCents),
    deliverySchedules: offered,
  };
}

/**
 * Every Product of one Vendor, ordered by name, with its Price and the
 * Delivery Schedules it offers. No other Vendor's Products are included.
 */
export async function listVendorProducts(
  database: MarketplaceDatabase,
  vendorId: number,
): Promise<CatalogueProduct[]> {
  const rows = await database
    .select()
    .from(products)
    .where(and(eq(products.vendorId, vendorId), isNull(products.stoppedOn)))
    .orderBy(asc(products.name), asc(products.id))
    .all();
  const offered = await schedulesByProduct(
    database,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    price: formatPrice(row.priceCents),
    deliverySchedules: offered.get(row.id) ?? [],
  }));
}

/** The Delivery Schedules each of these Products offers, in the fixed order. */
async function schedulesByProduct(
  database: MarketplaceDatabase,
  productIds: number[],
): Promise<Map<number, DeliverySchedule[]>> {
  const rows = await database
    .select()
    .from(productDeliverySchedules)
    .where(inArray(productDeliverySchedules.productId, productIds))
    .all();
  const byProduct = new Map<number, DeliverySchedule[]>();
  for (const row of rows) {
    byProduct.set(row.productId, [...(byProduct.get(row.productId) ?? []), row.deliverySchedule]);
  }
  for (const [productId, schedules] of byProduct) {
    byProduct.set(productId, inScheduleOrder(schedules));
  }
  return byProduct;
}

/** These Delivery Schedules once each, in the fixed order. */
function inScheduleOrder(schedules: readonly DeliverySchedule[]): DeliverySchedule[] {
  return deliverySchedules.filter((schedule) => schedules.includes(schedule));
}
