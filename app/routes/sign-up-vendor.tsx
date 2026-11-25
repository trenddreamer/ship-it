import { data, Form, Link, redirect } from "react-router";
import { z } from "zod";
import { currentAccount, startSession } from "~/accounts.server";
import { TextField } from "~/components/text-field";
import { db } from "~/db/client.server";
import { signUpVendor, vendorSignUpSchema } from "~/modules/accounts";
import { landingPath } from "~/modules/accounts/server";
import type { Route } from "./+types/sign-up-vendor";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sign up as a Vendor · Marketplace" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await currentAccount(request);
  if (account) throw redirect(landingPath(account));
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = vendorSignUpSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ fieldErrors: z.flattenError(parsed.error).fieldErrors }, 400);
  }
  const result = await signUpVendor(db, parsed.data);
  if (!result.ok) {
    return data({ fieldErrors: { email: ["That email already has an Account."] } }, 400);
  }
  return startSession(result.account);
}

export default function SignUpVendor({ actionData }: Route.ComponentProps) {
  const errors: Partial<Record<"email" | "password" | "businessName" | "description", string[]>> =
    actionData?.fieldErrors ?? {};
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-semibold">Sign up as a Vendor</h1>
      <p className="mt-2 text-muted">
        An Admin approves each new Vendor before Customers can see its Products. Buying instead?{" "}
        <Link to="/sign-up">Sign up as a Customer</Link>.
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
        <TextField
          label="Business name"
          name="businessName"
          autoComplete="organization"
          errors={errors.businessName}
        />
        <TextField label="Description" name="description" multiline errors={errors.description} />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-on-primary">
          Sign up
        </button>
      </Form>
    </main>
  );
}
