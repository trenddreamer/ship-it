import { z } from "zod";
import { deliverySchedules } from "~/db/schema";

const subscriptionId = z.coerce.number().int().positive();

/**
 * The forms on a Customer's Subscriptions page: switch a Subscription to
 * another Delivery Schedule (a `ScheduleSwitch`), or cancel it.
 */
export const changeSubscriptionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("switch"),
    subscriptionId,
    deliverySchedule: z.enum(deliverySchedules, { error: "Pick a Delivery Schedule." }),
  }),
  z.object({ intent: z.literal("cancel"), subscriptionId }),
]);
