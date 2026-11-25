import { data, Form, Link, redirect } from "react-router";
import { z } from "zod";
import { currentAccount, startSession } from "~/accounts.server";
import { TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { customerSignUpSchema, signUpCustomer } from "~/modules/accounts";
import { landingPath } from "~/modules/accounts/server";
import type { Route } from "./+types/sign-up";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sign up · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await currentAccount(request);
  if (account) throw redirect(landingPath(account));
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = customerSignUpSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ fieldErrors: z.flattenError(parsed.error).fieldErrors }, 400);
  }
  const result = await signUpCustomer(db, parsed.data);
  if (!result.ok) {
    return data({ fieldErrors: { email: ["That email already has an Account."] } }, 400);
  }
  return startSession(result.account);
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const errors: { email?: string[]; password?: string[] } = actionData?.fieldErrors ?? {};
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Sign up as a Customer</h1>
      <p className="mt-2 text-gray-600">
        Selling something? <Link to="/sign-up/vendor">Sign up as a Vendor</Link> instead.
      </p>
      <Form method="post" className="mt-6 space-y-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          errors={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          errors={errors.password}
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Sign up
        </button>
      </Form>
      <p className="mt-6 text-gray-600">
        Already have an Account? <Link to="/sign-in">Sign in</Link>.
      </p>
    </main>
  );
}
