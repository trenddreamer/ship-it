// Fixture: loads the database driver.
import { createClient } from "@libsql/client";

export const open = () => createClient({ url: ":memory:" });
