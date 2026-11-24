// `npm run db:seed`: fills a freshly migrated database with realistic
// Marketplace data. Every agent run starts from a new database, migrated
// and then seeded with this, so keep it deterministic and quick.
//
// Add seed data here as tables are added to schema.ts.
import { databasePath, db, type DB } from "./client.server";

export function seed(_database: DB): void {
  // Nothing to seed yet.
}

seed(db);
console.log(`Seeded ${databasePath}.`);
