import { Form, Link } from "react-router";
import { currentAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { searchQuerySchema, searchVendors } from "~/modules/search";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Marketplace" }];
}

// Routes stay thin: loaders and actions call modules in app/modules/, they
// hold no logic.
export async function loader({ request }: Route.LoaderArgs) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = searchQuerySchema.safeParse(params);
  // A query the schema rejects shows its error, and the empty search.
  const query = parsed.success ? parsed.data.q : "";
  const account = await currentAccount(request);
  return {
    // Visitors see the link too; following it asks them to sign in.
    canSubscribe: !account || account.kind === "customer",
    query,
    error: parsed.success ? undefined : parsed.error.issues[0]?.message,
    vendors: await searchVendors(db, query),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { query, error, vendors, canSubscribe } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Marketplace</h1>
      <p className="mt-2 text-muted">Find Vendors and the Products they deliver.</p>

      <Form method="get" role="search" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          aria-label="Search"
          placeholder="Search Vendors and Products"
          defaultValue={query}
          key={query}
          className="flex-1 rounded border border-line-strong px-3 py-2"
        />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-on-primary">
          Search
        </button>
      </Form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {vendors.length === 0 ? (
        <p className="mt-8 text-muted">
          {query ? "No Vendors match your search." : "No Vendors yet."}
        </p>
      ) : (
        <ul className="mt-8 space-y-8">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="rounded-lg border border-line p-6">
              <h2 className="text-xl font-semibold">{vendor.name}</h2>
              {vendor.description && <p className="mt-1 text-muted">{vendor.description}</p>}

              {vendor.products.length === 0 ? (
                <p className="mt-4 italic text-muted">No products yet</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {vendor.products.map((product) => (
                    <li key={product.id} className="flex justify-between gap-6 py-3">
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-muted">{product.description}</p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="font-semibold">{product.price}</span>
                        <span className="block text-xs text-muted">per Delivery</span>
                        {canSubscribe && (
                          <Link
                            to={`/products/${product.id}/subscribe`}
                            aria-label={`Subscribe to ${product.name}`}
                            className="mt-1 inline-block text-sm underline"
                          >
                            Subscribe
                          </Link>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
