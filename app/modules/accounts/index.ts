// Entry point: Accounts. Signing up as a Customer or a Vendor, signing in,
// and the first Admin. For sessions and access checks in loaders and
// actions, see `./server`.
export type { Account, AccountOf } from "./lib/account";
export { findAccount } from "./lib/account";
export { ensureFirstAdmin, type FirstAdmin } from "./lib/first-admin";
export {
  customerSignUpSchema,
  signInSchema,
  vendorSignUpSchema,
  type CustomerSignUp,
  type SignInInput,
  type VendorSignUp,
} from "./lib/schemas";
export { signIn, type SignInResult } from "./lib/sign-in";
export { signUpCustomer, signUpVendor, type SignUpResult } from "./lib/sign-up";
