import { z } from "zod";

/** A Price: whole cents of a rand, never negative. */
export const priceSchema = z.number().int().nonnegative();

const rands = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

/** Formats a Price, e.g. 150000 → "R 1 500,00". Throws on anything that isn't a Price. */
export function formatPrice(cents: number): string {
  return rands.format(priceSchema.parse(cents) / 100);
}
