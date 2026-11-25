import { Link } from "react-router";
import { requireAccount } from "~/accounts.server";
import { DueDeliveries } from "~/components/due-deliveries";
import { ProductSubscriptions } from "~/components/product-subscriptions";
import { db } from "~/db/client.server";
import { formatCalendarDate } from "~/modules/calendar";
import { deliveryScheduleOptions, listVendorProducts } from "~/modules/catalogue";
import { listVendorDueDeliveries } from "~/modules/deliveries";
import { listVendorSubscriptions } from "~/modules/subscriptions";
import { findVendor } from "~/modules/vendors";
import type { Route } from "./+types/vendor";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Vendor page · Marketplace" }];
}

const approvalMessages = {
  pending: "Pending: an Admin hasn't approved your business yet, so Customers can't see it.",
  approved: "Approved: Customers can see your business and its Products.",
  rejected:
    "Rejected: an Admin turned your business down, so Customers can't see it, and it can't apply again.",
} as const;

const scheduleLabels = new Map(deliveryScheduleOptions.map((o) => [o.value, o.label]));

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "vendor");
  const vendor = await findVendor(db, account.vendorId);
  if (!vendor) throw new Response("Your Vendor wasn't found.", { status: 404 });
  // A rejected Vendor sees only that it was rejected.
  if (vendor.approvalStatus === "rejected") {
    return { vendor, products: null, subscriptions: {}, dueDeliveries: [] };
  }
  const byProduct = await listVendorSubscriptions(db, account.vendorId);
  const due = await listVendorDueDeliveries(db, account.vendorId);
  return {
    vendor,
    dueDeliveries: due.map((delivery) => ({
      ...delivery,
      dueOn: formatCalendarDate(delivery.dueOn),
    })),
    products: await listVendorProducts(db, account.vendorId),
    subscriptions: Object.fromEntries(
      byProduct.map((product) => [
        product.productId,
        product.subscriptions.map((subscription) => ({
          id: subscription.id,
          customerEmail: subscription.customerEmail,
          schedule: scheduleLabels.get(subscription.deliverySchedule) ?? "",
          nextDue: formatCalendarDate(subscription.nextDueOn),
        })),
      ]),
    ),
  };
}

export default function VendorPage({ loaderData }: Route.ComponentProps) {
  const { vendor, products, subscriptions, dueDeliveries } = loaderData;
  if (!products) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-semibold">{vendor.name}</h1>
        <p className="mt-6 rounded border border-gray-200 p-4">{approvalMessages.rejected}</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">{vendor.name}</h1>
      <p className="mt-2 text-gray-600">{vendor.description}</p>
      <p className="mt-6 rounded border border-gray-200 p-4">
        {approvalMessages[vendor.approvalStatus]}
      </p>

      <section aria-labelledby="products-heading" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 id="products-heading" className="text-xl font-semibold">
            Your Products
          </h2>
          <Link to="/vendor/products/new" className="rounded bg-gray-900 px-4 py-2 text-white">
            Add a Product
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="mt-4 italic text-gray-500">No products yet</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {products.map((product) => (
              <li key={product.id} className="flex justify-between gap-6 py-3">
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.description}</p>
                  <p className="mt-1 text-sm">
                    Delivered:{" "}
                    {product.deliverySchedules.map((s) => scheduleLabels.get(s)).join(", ")}
                  </p>
                  <ProductSubscriptions subscriptions={subscriptions[product.id] ?? []} />
                </div>
                <p className="shrink-0 text-right">
                  <span className="font-semibold">{product.price}</span>
                  <span className="block text-xs text-gray-500">per Delivery</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DueDeliveries deliveries={dueDeliveries} />
    </main>
  );
}
