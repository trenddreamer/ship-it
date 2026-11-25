import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { databasePath } from "./path";
import * as schema from "./schema";

export { databasePath };

mkdirSync(dirname(databasePath), { recursive: true });

export const db = drizzle({ client: new Database(databasePath), schema });

export type DB = typeof db;
