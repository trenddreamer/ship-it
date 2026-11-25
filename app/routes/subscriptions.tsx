import { Link } from "react-router";
import { requireAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { findDeliveryAddress } from "~/modules/accounts";
import { formatCalendarDate } from "~/modules/calendar";
import { deliveryScheduleOptions } from "~/modules/catalogue";
import { listCustomerSubscriptions } from "~/modules/subscriptions";
import type { Route } from "./+types/subscriptions";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Subscriptions · Marketplace" }];
}

const scheduleLabels = new Map(deliveryScheduleOptions.map((o) => [o.value, o.label]));

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer");
  const address = await findDeliveryAddress(db, account.id);
  const subscriptions = await listCustomerSubscriptions(db, account.id);
  return {
    address:
      address && [address.street, address.suburb, address.city, address.postalCode].join(", "),
    subscriptions: subscriptions.map((subscription) => ({
      ...subscription,
      schedule: scheduleLabels.get(subscription.deliverySchedule),
      nextDue: formatCalendarDate(subscription.nextDueOn),
    })),
  };
}

export default function Subscriptions({ loaderData }: Route.ComponentProps) {
  const { address, subscriptions } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Your Subscriptions</h1>
      <p className="mt-2 text-gray-600">
        {address ? `Delivered to ${address}. ` : "You haven't set a Delivery Address yet. "}
        <Link to="/delivery-address" className="underline">
          {address ? "Change your Delivery Address" : "Set your Delivery Address"}
        </Link>
      </p>
      {subscriptions.length === 0 ? (
        <p className="mt-8 text-gray-600">
          No Subscriptions yet. <Link to="/">Find a Product</Link> to subscribe to.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-gray-100">
          {subscriptions.map((subscription) => (
            <li key={subscription.id} className="flex justify-between gap-6 py-3">
              <div>
                <h2 className="font-medium">{subscription.productName}</h2>
                <p className="text-sm text-gray-600">
                  From {subscription.vendorName}, delivered {subscription.schedule}
                </p>
                <p className="mt-1 text-sm">Next Delivery due {subscription.nextDue}</p>
              </div>
              <p className="shrink-0 text-right">
                <span className="font-semibold">{subscription.price}</span>
                <span className="block text-xs text-gray-500">per Delivery</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
