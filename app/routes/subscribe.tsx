import { data, Form, redirect } from "react-router";
import { z } from "zod";
import { requireAccount } from "~/accounts.server";
import { FormError } from "~/components/text-field";
import { db } from "~/db/client.server";
import { findDeliveryAddress } from "~/modules/accounts";
import { deliveryScheduleLabel } from "~/modules/deliveries";
import {
  findSubscribableProduct,
  subscribe,
  subscribeSchema,
  type SubscribeRefusal,
} from "~/modules/subscriptions";
import { today } from "~/today.server";
import type { Route } from "./+types/subscribe";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Subscribe to ${loaderData?.product.name ?? "a Product"} · Marketplace` }];
}

const productIdSchema = subscribeSchema.pick({ productId: true });

function notFound(): never {
  throw new Response("That Product wasn't found.", { status: 404 });
}

function addressFirst(productId: number) {
  return redirect(`/delivery-address?product=${productId}`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer");
  const parsed = productIdSchema.safeParse(params);
  if (!parsed.success) notFound();
  const product = await findSubscribableProduct(db, parsed.data.productId);
  if (!product) notFound();
  if (!(await findDeliveryAddress(db, account.id))) throw addressFirst(product.id);
  return { product };
}

const refusals: Record<
  Exclude<SubscribeRefusal, "no-delivery-address" | "product-not-found">,
  string
> = {
  "schedule-not-offered": "Pick one of the Delivery Schedules this Product offers.",
  "already-subscribed": "You already have a Subscription to this Product.",
};

export async function action({ request, params }: Route.ActionArgs) {
  const account = await requireAccount(request, "customer");
  const formData = await request.formData();
  const parsed = subscribeSchema.safeParse({ ...params, ...Object.fromEntries(formData) });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    if (fieldErrors.productId) notFound();
    return data({ scheduleErrors: fieldErrors.deliverySchedule, formError: undefined }, 400);
  }
  const result = await subscribe(db, account.id, parsed.data, today());
  if (result.ok) return redirect("/subscriptions");
  if (result.error === "no-delivery-address") return addressFirst(parsed.data.productId);
  if (result.error === "product-not-found") notFound();
  return data({ scheduleErrors: undefined, formError: refusals[result.error] }, 409);
}

export default function Subscribe({ loaderData, actionData }: Route.ComponentProps) {
  const { product } = loaderData;
  const scheduleErrors = actionData?.scheduleErrors;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Subscribe to {product.name}</h1>
      <p className="mt-2 text-gray-600">
        From {product.vendorName}. {product.description}
      </p>
      <p className="mt-4">
        <span className="font-semibold">{product.price}</span> per Delivery. Your first Delivery is
        due tomorrow.
      </p>
      <Form method="post" className="mt-6 space-y-4">
        <FormError message={actionData?.formError} />
        <fieldset aria-describedby={scheduleErrors ? "schedule-errors" : undefined}>
          <legend className="font-medium">Delivery Schedule</legend>
          {product.deliverySchedules.map((schedule) => (
            <label key={schedule} className="mt-1 flex items-center gap-2">
              <input type="radio" name="deliverySchedule" value={schedule} required />
              {deliveryScheduleLabel(schedule)}
            </label>
          ))}
          {scheduleErrors ? (
            <p id="schedule-errors" className="mt-1 text-sm text-red-700">
              {scheduleErrors.join(" ")}
            </p>
          ) : null}
        </fieldset>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Subscribe
        </button>
      </Form>
    </main>
  );
}
