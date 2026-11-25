import { Form } from "react-router";
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
  return {
    query,
    error: parsed.success ? undefined : parsed.error.issues[0]?.message,
    vendors: await searchVendors(db, query),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { query, error, vendors } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Marketplace</h1>
      <p className="mt-2 text-gray-600">Find Vendors and the Products they deliver.</p>

      <Form method="get" role="search" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          aria-label="Search"
          placeholder="Search Vendors and Products"
          defaultValue={query}
          key={query}
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Search
        </button>
      </Form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {vendors.length === 0 ? (
        <p className="mt-8 text-gray-600">
          {query ? "No Vendors match your search." : "No Vendors yet."}
        </p>
      ) : (
        <ul className="mt-8 space-y-8">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold">{vendor.name}</h2>
              {vendor.description && <p className="mt-1 text-gray-600">{vendor.description}</p>}

              {vendor.products.length === 0 ? (
                <p className="mt-4 italic text-gray-500">No products yet</p>
              ) : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {vendor.products.map((product) => (
                    <li key={product.id} className="flex justify-between gap-6 py-3">
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.description}</p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="font-semibold">{product.price}</span>
                        <span className="block text-xs text-gray-500">per Delivery</span>
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
