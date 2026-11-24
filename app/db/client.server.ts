import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/** The SQLite file. Override with DATABASE_PATH. */
export const databasePath = process.env.DATABASE_PATH ?? "data/marketplace.db";

mkdirSync(dirname(databasePath), { recursive: true });

export const db = drizzle({ client: new Database(databasePath), schema });

export type DB = typeof db;
