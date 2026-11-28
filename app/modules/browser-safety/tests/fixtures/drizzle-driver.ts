// Fixture: loads Drizzle's libSQL driver, which brings the database client.
import { drizzle } from "drizzle-orm/libsql";

export const open = () => drizzle(":memory:");
