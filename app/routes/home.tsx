import { db } from "../db/client.server";
import { listApprovedVendors } from "../modules/vendors";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Marketplace" }];
}

// Routes stay thin: loaders and actions call modules in app/modules/, they
// hold no logic.
export function loader() {
  return { vendors: listApprovedVendors(db) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { vendors } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Marketplace</h1>
      <p className="mt-2 text-gray-600">
        Find Vendors and the Products they deliver.
      </p>

      {vendors.length === 0 ? (
        <p className="mt-8 text-gray-600">No Vendors yet.</p>
      ) : (
        <ul className="mt-8 space-y-8">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold">{vendor.name}</h2>
              {vendor.description && (
                <p className="mt-1 text-gray-600">{vendor.description}</p>
              )}

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
