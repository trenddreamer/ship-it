import { data, Form, Link, redirect } from "react-router";
import { requireAccount } from "~/accounts.server";
import { FormError } from "~/components/text-field";
import { db } from "~/db/client.server";
import { findDeliveryAddress } from "~/modules/accounts";
import { formatCalendarDate } from "~/modules/calendar";
import { deliveryScheduleLabel } from "~/modules/deliveries";
import {
  cancelSubscription,
  changeSubscriptionSchema,
  listCustomerSubscriptions,
  switchDeliverySchedule,
  type SwitchRefusal,
} from "~/modules/subscriptions";
import { today } from "~/today.server";
import type { Route } from "./+types/subscriptions";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Subscriptions · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer");
  const address = await findDeliveryAddress(db, account.id);
  const subscriptions = await listCustomerSubscriptions(db, account.id);
  return {
    address: address && [address.street, address.city, address.postalCode].join(", "),
    subscriptions: subscriptions.map((subscription) => ({
      ...subscription,
      schedule: deliveryScheduleLabel(subscription.deliverySchedule),
      nextDue: subscription.nextDueOn && formatCalendarDate(subscription.nextDueOn),
      cancelled: subscription.cancelledOn && formatCalendarDate(subscription.cancelledOn),
      switchTo: subscription.switchTo.map((value) => ({
        value,
        label: deliveryScheduleLabel(value),
      })),
    })),
  };
}

const refusals: Record<SwitchRefusal, string> = {
  "subscription-not-found": "That Subscription isn't active any more.",
  "schedule-not-offered": "Pick one of the Delivery Schedules this Product offers.",
  "same-schedule": "That Subscription is already on that Delivery Schedule.",
};

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request, "customer");
  const parsed = changeSubscriptionSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ formError: "Pick a Delivery Schedule to switch to." }, 400);
  }
  const change = parsed.data;
  const result =
    change.intent === "switch"
      ? await switchDeliverySchedule(db, account.id, change, today())
      : await cancelSubscription(db, account.id, change.subscriptionId, today());
  if (result.ok) return redirect("/subscriptions");
  return data({ formError: refusals[result.error] }, 409);
}

export default function Subscriptions({ loaderData, actionData }: Route.ComponentProps) {
  const { address, subscriptions } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Your Subscriptions</h1>
      <p className="mt-2 text-muted">
        {address ? `Delivered to ${address}. ` : "You haven't set a Delivery Address yet. "}
        <Link to="/delivery-address" className="underline">
          {address ? "Change your Delivery Address" : "Set your Delivery Address"}
        </Link>
      </p>
      <div className="mt-4">
        <FormError message={actionData?.formError} />
      </div>
      {subscriptions.length === 0 ? (
        <p className="mt-8 text-muted">
          No Subscriptions yet. <Link to="/">Find a Product</Link> to subscribe to.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {subscriptions.map((subscription) => (
            <li key={subscription.id} className="py-3">
              <div className="flex justify-between gap-6">
                <div>
                  <h2 className="font-medium">{subscription.productName}</h2>
                  <p className="text-sm text-muted">
                    From {subscription.vendorName}, delivered {subscription.schedule}
                  </p>
                  <p className="mt-1 text-sm">
                    {subscription.cancelled
                      ? `Cancelled on ${subscription.cancelled}`
                      : `Next Delivery due ${subscription.nextDue}`}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="font-semibold">{subscription.price}</span>
                  <span className="block text-xs text-muted">per Delivery</span>
                </p>
              </div>
              {subscription.cancelled ? null : (
                <div className="mt-2 flex flex-wrap items-end gap-4 text-sm">
                  {subscription.switchTo.length > 0 ? (
                    <Form method="post" className="flex items-end gap-2">
                      <input type="hidden" name="intent" value="switch" />
                      <input type="hidden" name="subscriptionId" value={subscription.id} />
                      <label>
                        Switch to{" "}
                        <select
                          name="deliverySchedule"
                          className="rounded border border-line-strong px-2 py-1"
                        >
                          {subscription.switchTo.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="rounded border border-line-strong px-3 py-1">
                        Switch schedule
                      </button>
                    </Form>
                  ) : null}
                  <Form method="post">
                    <input type="hidden" name="intent" value="cancel" />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <button type="submit" className="rounded border border-danger-line px-3 py-1">
                      Cancel Subscription
                    </button>
                  </Form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
