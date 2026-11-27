// `npm run test:journey` (after `npm run build`): runs the journey against the
// production build, over a fresh database of its own.
//
// Each run gets a temporary database file and its own port, so several
// worktrees can run the journey at once. Set JOURNEY_PORT to pin the port;
// otherwise the OS picks a free one. Extra arguments go to `playwright test`,
// e.g. `npm run test:journey -- --headed`.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A port nothing is listening on right now. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

/** Runs a command to completion, inheriting stdio; returns its exit code. */
function run(command: string, args: string[], env: NodeJS.ProcessEnv): number {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  return result.status ?? 1;
}

const port = process.env.JOURNEY_PORT ?? String(await freePort());
const databaseDir = mkdtempSync(join(tmpdir(), "ship-it-journey-"));
const env: NodeJS.ProcessEnv = {
  ...process.env,
  JOURNEY_PORT: port,
  DATABASE_PATH: join(databaseDir, "marketplace.db"),
  // The daily job's secret, for the server and for runDueDeliveriesJob (e2e/helpers.ts).
  CRON_SECRET: "journey-cron-secret",
  // Feedback is only logged: App credentials in the developer's shell must never open real issues.
  FEEDBACK_APP_ID: "",
  FEEDBACK_APP_PRIVATE_KEY: "",
  FEEDBACK_APP_INSTALLATION_ID: "",
};
// Always a local file: never let the journey touch Turso.
delete env.TURSO_DATABASE_URL;
delete env.TURSO_AUTH_TOKEN;

let status = 1;
try {
  console.log(`Journey: port ${port}, database ${env.DATABASE_PATH}`);
  status =
    run("npm", ["run", "db:migrate"], env) ||
    run("npm", ["run", "db:seed"], env) ||
    run("npx", ["playwright", "test", ...process.argv.slice(2)], env);
} finally {
  rmSync(databaseDir, { recursive: true, force: true });
}
process.exit(status);
