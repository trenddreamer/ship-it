import { listApprovedVendors, type MarketplaceDatabase } from "~/modules/vendors";

type ShownVendor = Awaited<ReturnType<typeof listApprovedVendors>>[number];

/**
 * Keyword search over the Vendors a Customer may see. Every word of the
 * query (split on whitespace) must appear, ignoring case, somewhere in the
 * Vendor's name or description or in one of its Products' names or
 * descriptions, so more words narrow the results. Each matching Vendor comes
 * with all its Products and their Prices, ordered as `listApprovedVendors`
 * orders them. The empty query returns every approved Vendor.
 *
 * It filters what `listApprovedVendors` returns, so anything that module
 * hides from Customers (pending and rejected Vendors, and their Products)
 * is never found here either.
 */
export async function searchVendors(database: MarketplaceDatabase, query: string) {
  // Extra whitespace gives empty words, which match anything.
  const words = query.toLocaleLowerCase().split(/\s/);
  const vendors = await listApprovedVendors(database);
  return vendors.filter((vendor) => {
    const text = searchableText(vendor);
    return words.every((word) => text.includes(word));
  });
}

/** Everything a query can match in a Vendor, lower-cased. */
function searchableText(vendor: ShownVendor): string {
  return (
    [vendor, ...vendor.products]
      .flatMap((shown) => [shown.name, shown.description])
      // No word holds whitespace, so none can match across two of these.
      .join("\n")
      .toLocaleLowerCase()
  );
}
