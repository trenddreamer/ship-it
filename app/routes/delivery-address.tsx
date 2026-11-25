import { data, Form, redirect } from "react-router";
import { z } from "zod";
import { requireAccount } from "~/accounts.server";
import { TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { deliveryAddressSchema, findDeliveryAddress, setDeliveryAddress } from "~/modules/accounts";
import { subscribeSchema } from "~/modules/subscriptions";
import type { Route } from "./+types/delivery-address";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Your Delivery Address · Marketplace" }];
}

// `?product=<id>`: the Customer was on their way to subscribe to that
// Product, so go back there once the address is saved.
const returnToSchema = z.object({ product: subscribeSchema.shape.productId });

function returnTo(request: Request) {
  const parsed = returnToSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  return parsed.success ? parsed.data.product : null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer");
  return {
    address: await findDeliveryAddress(db, account.id),
    subscribing: returnTo(request) !== null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request, "customer");
  const parsed = deliveryAddressSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ fieldErrors: z.flattenError(parsed.error).fieldErrors }, 400);
  }
  await setDeliveryAddress(db, account.id, parsed.data);
  const product = returnTo(request);
  return redirect(product === null ? "/subscriptions" : `/products/${product}/subscribe`);
}

export default function DeliveryAddressPage({ loaderData, actionData }: Route.ComponentProps) {
  const { address, subscribing } = loaderData;
  const errors: Partial<Record<keyof z.infer<typeof deliveryAddressSchema>, string[]>> =
    actionData?.fieldErrors ?? {};
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Your Delivery Address</h1>
      <p className="mt-2 text-muted">
        {subscribing && !address ? "Before you subscribe, tell us where to deliver. " : ""}
        All your Subscriptions are delivered here.
      </p>
      <Form method="post" className="mt-6 space-y-4">
        <TextField
          label="Street address"
          name="street"
          autoComplete="address-line1"
          defaultValue={address?.street}
          errors={errors.street}
        />
        <TextField
          label="Suburb"
          name="suburb"
          autoComplete="address-level3"
          defaultValue={address?.suburb}
          errors={errors.suburb}
        />
        <TextField
          label="City or town"
          name="city"
          autoComplete="address-level2"
          defaultValue={address?.city}
          errors={errors.city}
        />
        <TextField
          label="Postal code"
          name="postalCode"
          autoComplete="postal-code"
          defaultValue={address?.postalCode}
          errors={errors.postalCode}
        />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-on-primary">
          Save Delivery Address
        </button>
      </Form>
    </main>
  );
}
