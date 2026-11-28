// Configuration from the environment. Every value has a local default (or,
// for the Feedback App's credentials, works without them), so local development, the checks
// and the journey need no configuration. Set them all in production.
//
// - SESSION_SECRET: signs the session cookie.
// - SESSION_COOKIE_SECURE: "true" to send the session cookie over HTTPS only.
// - ADMIN_EMAIL, ADMIN_PASSWORD: the first Admin, created when the app starts
//   and no Admin exists (see app/accounts.server.ts). Nobody signs up as one.
// - CRON_SECRET: callers of the daily job's route send it as
//   `Authorization: Bearer <secret>`. Vercel Cron does so by itself.
// - ACCEPT_JOB_TODAY: "true" lets the job's route take a `?today=` under
//   NODE_ENV=production. Only the journey sets it (its server is a production
//   build). Outside production the route always accepts one; on a Vercel
//   production deployment (VERCEL_ENV=production) never.
// - FEEDBACK_APP_ID, FEEDBACK_APP_PRIVATE_KEY, FEEDBACK_APP_INSTALLATION_ID:
//   the Feedback App's ID, private key (PEM; on one line, write `\n` for its
//   line breaks) and the ID of its installation on the Home repo (ADR-0004).
//   When all three are set, each piece of Feedback mints a short-lived
//   installation token and opens a real GitHub issue as the App, labelled
//   `agent:explore`, `feedback` and FEEDBACK_REPO_LABEL. When none is set, it
//   is only logged to the server console, with no default and no warning.
//   When only some are, it is only logged, with a warning naming the rest.
// - FEEDBACK_GITHUB_REPO: the Home repo, where Feedback issues open, as
//   `owner/name`. Defaults to `trenddreamer/ship-it`.
// - FEEDBACK_REPO_LABEL: the `repo:` label that routes Feedback to this app's
//   Enrolled repo. Defaults to `repo:marketplace`.

const defaults = {
  SESSION_SECRET: "ship-it-local-session-secret",
  ADMIN_EMAIL: "admin@ship-it.test",
  ADMIN_PASSWORD: "admin-password",
  CRON_SECRET: "ship-it-local-cron-secret",
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
  dueDeliveriesJob: {
    secret: setting("CRON_SECRET"),
    acceptsToday:
      process.env.VERCEL_ENV !== "production" &&
      (process.env.NODE_ENV !== "production" || process.env.ACCEPT_JOB_TODAY === "true"),
  },
  feedback: {
    appId: process.env.FEEDBACK_APP_ID,
    privateKey: process.env.FEEDBACK_APP_PRIVATE_KEY,
    installationId: process.env.FEEDBACK_APP_INSTALLATION_ID,
    repo: process.env.FEEDBACK_GITHUB_REPO || "trenddreamer/ship-it",
    repoLabel: process.env.FEEDBACK_REPO_LABEL || "repo:marketplace",
  },
};
