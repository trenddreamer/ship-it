import { z } from "zod";
import { deliverySchedules } from "~/db/schema";

/**
 * The subscribe form: the Product id from the URL and the Delivery Schedule
 * the Customer picked. Output is a `NewSubscription`.
 */
export const subscribeSchema = z.object({
  productId: z.coerce.number().int().positive(),
  deliverySchedule: z.enum(deliverySchedules, { error: "Pick a Delivery Schedule." }),
});
