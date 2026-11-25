import { data, Form, Link, redirect } from "react-router";
import { z } from "zod";
import { currentAccount, startSession } from "~/accounts.server";
import { FormError, TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { signIn, signInSchema } from "~/modules/accounts";
import { landingPath } from "~/modules/accounts/server";
import type { Route } from "./+types/sign-in";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sign in · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await currentAccount(request);
  if (account) throw redirect(landingPath(account));
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = signInSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ fieldErrors: z.flattenError(parsed.error).fieldErrors, error: undefined }, 400);
  }
  const result = await signIn(db, parsed.data);
  if (!result.ok) {
    // One message for both, so it doesn't say whether the email exists.
    return data({ fieldErrors: undefined, error: "Wrong email or password." }, 400);
  }
  return startSession(result.account);
}

export default function SignIn({ actionData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <Form method="post" className="mt-6 space-y-4">
        <FormError message={actionData?.error} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          errors={actionData?.fieldErrors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          errors={actionData?.fieldErrors?.password}
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Sign in
        </button>
      </Form>
      <p className="mt-6 text-gray-600">
        No Account yet? <Link to="/sign-up">Sign up</Link>.
      </p>
    </main>
  );
}
