import { z } from "zod";

/**
 * A keyword search as it arrives in the URL: `?q=free-range eggs`. Parse
 * `Object.fromEntries(url.searchParams)` with it. A missing `q` is the empty
 * search, which shows every approved Vendor.
 */
export const searchQuerySchema = z.object({
  q: z.string().trim().max(200, "Keep your search under 200 characters.").default(""),
});
