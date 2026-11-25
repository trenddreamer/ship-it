// `npm run db:reset`: deletes the SQLite file so `db:migrate` and `db:seed`
// can rebuild it from scratch. Stop the dev server first: it keeps the old
// file open and goes on serving it. It never touches a Turso database.
import { rm } from "node:fs/promises";
import { databasePath } from "./path";

if (process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is set. db:reset only deletes a local database file.");
}
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  await rm(`${databasePath}${suffix}`, { force: true });
}
console.log(`Deleted ${databasePath}.`);
