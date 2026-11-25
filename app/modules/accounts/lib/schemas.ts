import { z } from "zod";

/** An email, trimmed and lower-cased so the same address can't sign up twice. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

const newPassword = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  .max(200, { error: "Use at most 200 characters." });

/** The sign-up form for a Customer. */
export const customerSignUpSchema = z.object({ email, password: newPassword });
export type CustomerSignUp = z.infer<typeof customerSignUpSchema>;

/** The sign-up form for a Vendor: their Account and their business. */
export const vendorSignUpSchema = z.object({
  email,
  password: newPassword,
  businessName: z
    .string()
    .trim()
    .min(1, { error: "Enter your business name." })
    .max(120, { error: "Keep your business name to 120 characters." }),
  description: z
    .string()
    .trim()
    .min(1, { error: "Describe your business." })
    .max(2000, { error: "Keep your description to 2,000 characters." }),
});
export type VendorSignUp = z.infer<typeof vendorSignUpSchema>;

/** The sign-in form. Any password is checked; only new passwords have rules. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});
export type SignInInput = z.infer<typeof signInSchema>;
