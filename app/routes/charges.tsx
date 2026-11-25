import { requireAccount } from "~/accounts.server";
import { ChargeList } from "~/components/charge-list";
import { db } from "~/db/client.server";
import { formatCalendarDate } from "~/modules/calendar";
import { listCustomerCharges } from "~/modules/charges";
import type { Route } from "./+types/charges";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Charges · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer");
  const charges = await listCustomerCharges(db, account.id);
  return {
    charges: charges.map((charge) => ({
      id: charge.id,
      productName: charge.productName,
      party: `From ${charge.vendorName}`,
      amount: charge.amount,
      chargedOn: formatCalendarDate(charge.chargedOn),
    })),
  };
}

export default function Charges({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Your Charges</h1>
      <p className="mt-2 text-gray-600">
        You're charged for each Delivery when its Vendor ships it, newest first.
      </p>
      <ChargeList charges={loaderData.charges} empty="No Charges yet." />
    </main>
  );
}
