import { redirect } from "react-router";
import { endSession } from "~/accounts.server";
import type { Route } from "./+types/sign-out";

// Signing out is a POST (the form in the layout's header). A GET goes home.
export function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
  return endSession(request);
}
