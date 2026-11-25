// Entry point: sessions and access checks for loaders and actions. The app
// makes one `AccountSessions` (see app/accounts.server.ts) and routes call
// `requireAccount(request, kind)` before anything else.
export {
  createAccountSessions,
  landingPath,
  type AccountSessions,
  type SessionOptions,
} from "./lib/sessions";
