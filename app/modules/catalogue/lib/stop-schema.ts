import { z } from "zod";
import { deliverySchedules } from "~/db/schema";
import type { VendorStop } from "~/modules/subscriptions";

/**
 * What a Vendor asks to stop: the Product id from the URL, and optionally a
 * Delivery Schedule of it (`schedule`, from the query string or the form).
 * No schedule, or an empty one, means the whole Product.
 */
export const stopSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    schedule: z.union([z.literal(""), z.enum(deliverySchedules)]).optional(),
  })
  .transform(({ productId, schedule }): VendorStop => ({
    productId,
    deliverySchedule: schedule || null,
  }));
