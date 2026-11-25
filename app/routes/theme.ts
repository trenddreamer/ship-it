// A resource route (no page): the header's theme icon posts here, with
// useFetcher, so switching theme never leaves the page. Anyone may switch,
// signed in or not. The choice goes in a cookie, which the root loader reads.
import { data } from "react-router";
import { saveThemeChoice, themeFormSchema } from "~/modules/theme/server";
import type { Route } from "./+types/theme";

export async function action({ request }: Route.ActionArgs) {
  const parsed = themeFormSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return data({ kind: "invalid" as const }, 400);
  const { theme } = parsed.data;
  return data(
    { kind: "saved" as const, theme },
    { headers: { "Set-Cookie": await saveThemeChoice(theme) } },
  );
}
