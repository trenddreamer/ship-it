// `npm run db:migrate`: applies every migration in app/db/migrations/.
import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { databaseLocation, db } from "./client.server";

const migrationsFolder = "app/db/migrations";

if (existsSync(`${migrationsFolder}/meta/_journal.json`)) {
  await migrate(db, { migrationsFolder });
  console.log(`Migrated ${databaseLocation}.`);
} else {
  console.log(`No migrations yet. ${databaseLocation} is ready.`);
}
