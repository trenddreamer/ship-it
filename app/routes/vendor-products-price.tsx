import { data, Form, Link, redirect } from "react-router";
import { z } from "zod";
import { requireAccount } from "~/accounts.server";
import { FormError, TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { changePrice, changePriceSchema, listVendorProducts } from "~/modules/catalogue";
import { findVendor } from "~/modules/vendors";
import { today } from "~/today.server";
import type { Route } from "./+types/vendor-products-price";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Change a Price · Marketplace" }];
}

function notFound(): never {
  throw new Response("That Product wasn't found.", { status: 404 });
}

/** The signed-in Vendor's Account. A rejected Vendor sees only that it was rejected. */
async function requireVendorNotRejected(request: Request) {
  const account = await requireAccount(request, "vendor");
  const vendor = await findVendor(db, account.vendorId);
  if (vendor?.approvalStatus === "rejected") {
    throw new Response("Your business was rejected, so it can't change Prices.", { status: 403 });
  }
  return account;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireVendorNotRejected(request);
  const products = await listVendorProducts(db, account.vendorId);
  const product = products.find((p) => String(p.id) === params.productId);
  if (!product) notFound();
  return { name: product.name, price: product.price };
}

export async function action({ request, params }: Route.ActionArgs) {
  const account = await requireVendorNotRejected(request);
  const parsed = changePriceSchema.safeParse({
    ...Object.fromEntries(await request.formData()),
    productId: params.productId,
  });
  if (!parsed.success) {
    return data(
      { fieldErrors: z.flattenError(parsed.error).fieldErrors, formError: undefined },
      400,
    );
  }
  const result = await changePrice(db, account.vendorId, parsed.data, today());
  if (result.ok) return redirect("/vendor");
  if (result.error === "product-not-found") notFound();
  return data(
    { fieldErrors: {}, formError: "That is already the Price. Enter a different one." },
    409,
  );
}

export default function ChangePrice({ loaderData, actionData }: Route.ComponentProps) {
  const errors: Partial<Record<"price", string[]>> = actionData?.fieldErrors ?? {};
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Change the Price of {loaderData.name}</h1>
      <p className="mt-2 text-gray-600">
        It costs {loaderData.price} per Delivery now. New subscribers pay the new Price straight
        away. Your current subscribers are told, and keep the current Price for Deliveries due in
        the next 7 days. <Link to="/vendor">Back to your Products</Link>.
      </p>
      <Form method="post" className="mt-6 space-y-4">
        <FormError message={actionData?.formError} />
        <TextField label="New Price per Delivery (R)" name="price" errors={errors.price} />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Change Price
        </button>
      </Form>
    </main>
  );
}
