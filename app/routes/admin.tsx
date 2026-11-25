import { data, Form } from "react-router";
import { requireAccount } from "~/accounts.server";
import { FormError } from "~/components/text-field";
import { db } from "~/db/client.server";
import { decideVendor, listPendingVendors, vendorDecisionSchema } from "~/modules/vendors";
import type { Route } from "./+types/admin";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "admin");
  return { email: account.email, pending: await listPendingVendors(db) };
}

const refusals = {
  "not-found": "That Vendor wasn't found.",
  "already-decided": "That Vendor has already been approved or rejected.",
} as const;

export async function action({ request }: Route.ActionArgs) {
  await requireAccount(request, "admin");
  const parsed = vendorDecisionSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return data({ error: "Choose a Vendor and a decision." }, 400);
  const result = await decideVendor(db, parsed.data);
  if (!result.ok) return data({ error: refusals[result.error] }, 409);
  return { error: undefined };
}

export default function AdminPage({ loaderData, actionData }: Route.ComponentProps) {
  const { email, pending } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="mt-2 text-muted">Signed in as {email}.</p>

      <section aria-labelledby="pending-heading" className="mt-8">
        <h2 id="pending-heading" className="text-xl font-semibold">
          Vendors awaiting approval
        </h2>
        <FormError message={actionData?.error} />
        {pending.length === 0 ? (
          <p className="mt-4 italic text-muted">No Vendors are awaiting approval.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((vendor) => (
              <li key={vendor.id} className="rounded-lg border border-line p-4">
                <h3 className="font-semibold">{vendor.name}</h3>
                {vendor.description && <p className="mt-1 text-muted">{vendor.description}</p>}
                <Form method="post" className="mt-3 flex gap-2">
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    aria-label={`Approve ${vendor.name}`}
                    className="rounded bg-primary px-4 py-2 text-on-primary"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    aria-label={`Reject ${vendor.name}`}
                    className="rounded border border-line-strong px-4 py-2"
                  >
                    Reject
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
