import { z } from "zod";
import { priceSchema } from "./price";

// Rand, then at most two digits of cents after a point or a comma.
const randAmount = /^\d+(?:[.,]\d{1,2})?$/;

/**
 * A Price as a person types it into a form: rand, to the cent at most, with
 * a point or a comma ("150", "150,50"). Parses to whole cents, checked with
 * `priceSchema`. Never goes through a float, so "0.29" is exactly 29 cents.
 */
export const priceInputSchema = z
  .string()
  .trim()
  .regex(randAmount, { error: "Enter the Price in rand, to the cent at most, e.g. 150 or 150,50." })
  .transform((typed) => {
    const [rand, cents = ""] = typed.split(/[.,]/);
    return Number(rand) * 100 + Number(cents.padEnd(2, "0"));
  })
  .refine((cents) => priceSchema.safeParse(cents).success, {
    error: "That Price is too large.",
  });
