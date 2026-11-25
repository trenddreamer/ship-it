import { requireAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { findVendor } from "~/modules/vendors";
import type { Route } from "./+types/vendor";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Vendor page · Marketplace" }];
}

const approvalMessages = {
  pending: "Pending: an Admin hasn't approved your business yet, so Customers can't see it.",
  approved: "Approved: Customers can see your business and its Products.",
  rejected: "Rejected: an Admin turned your business down, so Customers can't see it.",
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "vendor");
  const vendor = await findVendor(db, account.vendorId);
  if (!vendor) throw new Response("Your Vendor wasn't found.", { status: 404 });
  return { vendor };
}

// A placeholder: later tickets add the Vendor's Products and Deliveries.
export default function VendorPage({ loaderData }: Route.ComponentProps) {
  const { vendor } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">{vendor.name}</h1>
      <p className="mt-2 text-gray-600">{vendor.description}</p>
      <p className="mt-6 rounded border border-gray-200 p-4">
        {approvalMessages[vendor.approvalStatus]}
      </p>
    </main>
  );
}
