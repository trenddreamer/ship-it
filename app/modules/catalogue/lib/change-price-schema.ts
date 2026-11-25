import { z } from "zod";
import { productIdSchema } from "./product-params-schema";
import { priceInputSchema } from "~/modules/price";
import type { PriceChange } from "./change-price";

/**
 * The change-Price form: the Product id from the URL and the new Price typed
 * in rand (`price`). Output is a `PriceChange`, in whole cents.
 */
export const changePriceSchema = z
  .object({
    productId: productIdSchema,
    price: priceInputSchema,
  })
  .transform(({ productId, price }): PriceChange => ({ productId, priceCents: price }));
