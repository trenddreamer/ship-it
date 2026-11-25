import { z } from "zod";

/** The "Mark shipped" form on the Vendor page: which Delivery to mark shipped. */
export const shipDeliverySchema = z.object({
  deliveryId: z.coerce.number().int().positive(),
});
