// A resource route (no page): the Vendor page's "Offer it" form posts here
// to add a Delivery Schedule to one of the Vendor's Products, then goes back.
import { redirect } from "react-router";
import { requireActingVendor } from "~/accounts.server";
import { db } from "~/db/client.server";
import { offerDeliverySchedule, offerScheduleSchema } from "~/modules/catalogue";
import type { Route } from "./+types/vendor-products-schedules";

export async function action({ request, params }: Route.ActionArgs) {
  const account = await requireActingVendor(request);
  const formData = await request.formData();
  const parsed = offerScheduleSchema.safeParse({ ...params, ...Object.fromEntries(formData) });
  if (!parsed.success) {
    throw new Response("Pick a Delivery Schedule to offer.", { status: 400 });
  }
  const result = await offerDeliverySchedule(db, account.vendorId, parsed.data);
  if (result.ok) return redirect("/vendor");
  if (result.error === "product-not-found") {
    throw new Response("That Product wasn't found.", { status: 404 });
  }
  throw new Response("That Product already offers that Delivery Schedule.", { status: 409 });
}
