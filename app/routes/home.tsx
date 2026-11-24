import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Marketplace" }];
}

// Placeholder until the first Marketplace page is built. Routes stay thin:
// loaders and actions call modules in app/modules/, they hold no logic.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Marketplace</h1>
      <p className="mt-2 text-gray-600">Nothing here yet.</p>
    </main>
  );
}
