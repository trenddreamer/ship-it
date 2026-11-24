// `npm run db:migrate`: applies every migration in app/db/migrations/.
import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databasePath, db } from "./client.server";

const migrationsFolder = "app/db/migrations";

if (existsSync(`${migrationsFolder}/meta/_journal.json`)) {
  migrate(db, { migrationsFolder });
  console.log(`Migrated ${databasePath}.`);
} else {
  console.log(`No migrations yet. ${databasePath} is ready.`);
}
