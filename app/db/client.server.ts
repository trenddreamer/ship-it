// The app's database: libSQL. Locally, in agent runs and in CI it is the
// SQLite file at `databasePath` (DATABASE_PATH overrides it). In production,
// set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to connect to Turso instead.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { databasePath } from "./path";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;

/** Where the database lives, for messages: the Turso URL or the file path. */
export const databaseLocation = tursoUrl ?? databasePath;

function connect() {
  if (tursoUrl) {
    return createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  mkdirSync(dirname(databasePath), { recursive: true });
  return createClient({ url: `file:${databasePath}` });
}

export const db = drizzle({ client: connect(), schema });

export type DB = typeof db;
