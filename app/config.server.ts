// Configuration from the environment. Every value has a local default, so
// local development, the checks and the journey need no configuration.
// Set them all in production.
//
// - SESSION_SECRET: signs the session cookie.
// - SESSION_COOKIE_SECURE: "true" to send the session cookie over HTTPS only.
// - ADMIN_EMAIL, ADMIN_PASSWORD: the first Admin, created when the app starts
//   and no Admin exists (see app/accounts.server.ts). Nobody signs up as one.

const defaults = {
  SESSION_SECRET: "ship-it-local-session-secret",
  ADMIN_EMAIL: "admin@ship-it.test",
  ADMIN_PASSWORD: "admin-password",
} as const;

function setting(name: keyof typeof defaults): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    console.warn(`${name} is not set: using the local default. Set it in production.`);
  }
  return defaults[name];
}

export const config = {
  sessionSecret: setting("SESSION_SECRET"),
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === "true",
  firstAdmin: {
    email: setting("ADMIN_EMAIL").trim().toLowerCase(),
    password: setting("ADMIN_PASSWORD"),
  },
};
