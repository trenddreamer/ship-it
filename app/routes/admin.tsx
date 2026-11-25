import { requireAccount } from "~/accounts.server";
import type { Route } from "./+types/admin";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "admin");
  return { email: account.email };
}

// A placeholder: later tickets add approving Vendors.
export default function AdminPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="mt-2 text-gray-600">Signed in as {loaderData.email}.</p>
    </main>
  );
}
