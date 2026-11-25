import { z } from "zod";

/** A Product's id, as it comes in a URL (e.g. `/vendor/products/:productId/price`). */
export const productIdSchema = z.coerce.number().int().positive();

/** The route params of a Vendor's page for one of its Products. */
export const productParamsSchema = z.object({ productId: productIdSchema });
