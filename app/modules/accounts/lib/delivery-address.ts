import { eq } from "drizzle-orm";
import { z } from "zod";
import { deliveryAddresses } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

function line(missing: string) {
  return z
    .string()
    .trim()
    .min(1, { error: missing })
    .max(120, { error: "Keep it to 120 characters." });
}

/** The Delivery Address form: every line is needed, the postal code is 4 digits. */
export const deliveryAddressSchema = z.object({
  street: line("Enter the street address."),
  suburb: line("Enter the suburb."),
  city: line("Enter the city or town."),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, { error: "Enter the 4-digit postal code." }),
});

/** Where a Customer's Deliveries are sent. */
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

/**
 * Sets a Customer's Delivery Address, replacing the one they had: each
 * Customer has one, used for all their Subscriptions.
 */
export async function setDeliveryAddress(
  database: MarketplaceDatabase,
  customerId: number,
  address: DeliveryAddress,
): Promise<void> {
  await database
    .insert(deliveryAddresses)
    .values({ accountId: customerId, ...address })
    .onConflictDoUpdate({ target: deliveryAddresses.accountId, set: address })
    .run();
}

/** A Customer's Delivery Address, or null when they haven't set one. */
export async function findDeliveryAddress(
  database: MarketplaceDatabase,
  customerId: number,
): Promise<DeliveryAddress | null> {
  const row = await database
    .select({
      street: deliveryAddresses.street,
      suburb: deliveryAddresses.suburb,
      city: deliveryAddresses.city,
      postalCode: deliveryAddresses.postalCode,
    })
    .from(deliveryAddresses)
    .where(eq(deliveryAddresses.accountId, customerId))
    .get();
  return row ?? null;
}
