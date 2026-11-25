import { Form, Link, redirect } from "react-router";
import { requireActingVendor } from "~/accounts.server";
import { db } from "~/db/client.server";
import { previewStop, stopSchema, stopSelling } from "~/modules/catalogue";
import { deliveryScheduleLabel } from "~/modules/deliveries";
import { today } from "~/today.server";
import type { Route } from "./+types/vendor-products-stop";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Stop selling · Marketplace" }];
}

function notFound(): never {
  throw new Response("That Product or Delivery Schedule wasn't found.", { status: 404 });
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireActingVendor(request);
  const url = new URL(request.url);
  const parsed = stopSchema.safeParse({ ...params, ...Object.fromEntries(url.searchParams) });
  if (!parsed.success) notFound();
  const preview = await previewStop(db, account.vendorId, parsed.data);
  if (!preview) notFound();
  return {
    ...preview,
    scheduleLabel: preview.deliverySchedule && deliveryScheduleLabel(preview.deliverySchedule),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const account = await requireActingVendor(request);
  const formData = await request.formData();
  const parsed = stopSchema.safeParse({ ...params, ...Object.fromEntries(formData) });
  if (!parsed.success) notFound();
  const result = await stopSelling(db, account.vendorId, parsed.data, today());
  if (!result.ok) notFound();
  return redirect("/vendor");
}

export default function StopSelling({ loaderData }: Route.ComponentProps) {
  const { productName, deliverySchedule, scheduleLabel, activeSubscriptions } = loaderData;
  const what = scheduleLabel
    ? `Stop delivering ${productName} ${scheduleLabel.toLowerCase()}?`
    : `Stop selling ${productName}?`;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">{what}</h1>
      <p role="alert" className="mt-6 rounded border border-amber-300 bg-amber-50 p-4">
        This will cancel {activeSubscriptions} active Subscription
        {activeSubscriptions === 1 ? "" : "s"}, and tell each Customer why. Deliveries already due
        still stand. You can't undo it: to sell it again, add it again.
      </p>
      <Form method="post" className="mt-6 flex items-center gap-4">
        <input type="hidden" name="schedule" value={deliverySchedule ?? ""} />
        <button type="submit" className="rounded bg-red-700 px-4 py-2 text-white">
          {scheduleLabel ? `Stop delivering ${scheduleLabel.toLowerCase()}` : "Stop selling"}
        </button>
        <Link to="/vendor" className="underline">
          Keep it
        </Link>
      </Form>
    </main>
  );
}
