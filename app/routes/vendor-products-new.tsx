import { data, Form, Link, redirect } from "react-router";
import { z } from "zod";
import { requireActingVendor } from "~/accounts.server";
import { TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { addProduct, newProductSchema } from "~/modules/catalogue";
import { deliveryScheduleOptions } from "~/modules/deliveries/client";
import { today } from "~/today.server";
import type { Route } from "./+types/vendor-products-new";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Add a Product · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireActingVendor(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const account = await requireActingVendor(request);
  const formData = await request.formData();
  const parsed = newProductSchema.safeParse({
    ...Object.fromEntries(formData),
    deliverySchedules: formData.getAll("deliverySchedules"),
  });
  if (!parsed.success) {
    return data({ fieldErrors: z.flattenError(parsed.error).fieldErrors }, 400);
  }
  await addProduct(db, account.vendorId, parsed.data, today());
  return redirect("/vendor");
}

export default function NewProduct({ actionData }: Route.ComponentProps) {
  const errors: Partial<Record<"name" | "description" | "price" | "deliverySchedules", string[]>> =
    actionData?.fieldErrors ?? {};
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Add a Product</h1>
      <p className="mt-2 text-muted">
        Customers pay the Price for each Delivery, whichever Delivery Schedule they pick.{" "}
        <Link to="/vendor">Back to your Products</Link>.
      </p>
      <Form method="post" className="mt-6 space-y-4">
        <TextField label="Name" name="name" errors={errors.name} />
        <TextField label="Description" name="description" multiline errors={errors.description} />
        <TextField label="Price per Delivery (R)" name="price" errors={errors.price} />
        <fieldset aria-describedby={errors.deliverySchedules ? "schedules-errors" : undefined}>
          <legend className="font-medium">Delivery Schedules</legend>
          {deliveryScheduleOptions.map((option) => (
            <label key={option.value} className="mt-1 flex items-center gap-2">
              <input type="checkbox" name="deliverySchedules" value={option.value} />
              {option.label}
            </label>
          ))}
          {errors.deliverySchedules ? (
            <p id="schedules-errors" className="mt-1 text-sm text-danger">
              {errors.deliverySchedules.join(" ")}
            </p>
          ) : null}
        </fieldset>
        <button type="submit" className="rounded bg-primary px-4 py-2 text-on-primary">
          Add Product
        </button>
      </Form>
    </main>
  );
}
