import { z } from "zod";
import { deliverySchedules } from "~/db/schema";
import { priceInputSchema } from "~/modules/price";
import type { NewProduct } from "./products";

const deliverySchedule = z.enum(deliverySchedules, {
  error: "Pick from weekly, every two weeks or monthly.",
});

/**
 * The form a Vendor fills in to add a Product. The Price is typed in rand
 * and comes out as whole cents. `deliverySchedules` is every ticked value
 * (`formData.getAll`), and at least one is needed.
 */
export const newProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter the Product's name." })
      .max(120, { error: "Keep the name to 120 characters." }),
    description: z
      .string()
      .trim()
      .min(1, { error: "Describe the Product." })
      .max(2000, { error: "Keep the description to 2,000 characters." }),
    price: priceInputSchema,
    deliverySchedules: z.array(deliverySchedule).transform((ticked, context) => {
      const [first, ...rest] = ticked;
      if (first) return [first, ...rest] as const;
      context.addIssue({ code: "custom", message: "Pick at least one Delivery Schedule." });
      return z.NEVER;
    }),
  })
  .transform(({ price, ...product }): NewProduct => ({ ...product, priceCents: price }));
