// `npm run db:reset`: deletes the SQLite file so `db:migrate` and `db:seed`
// can rebuild it from scratch. Stop the dev server first: it keeps the old
// file open and goes on serving it.
import { rmSync } from "node:fs";
import { databasePath } from "./path";

for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}
console.log(`Deleted ${databasePath}.`);
