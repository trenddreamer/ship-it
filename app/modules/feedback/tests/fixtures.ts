// Test fixtures: a fresh in-memory Marketplace database, Accounts to give
// Feedback, the Feedback rows recorded, and a Tracker that records issues.
import * as schema from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";
import { findAccount, type Account } from "~/modules/accounts";
import type { Tracker, TrackerIssue } from "../server";

export { freshDatabase } from "~/db/fresh-database";

/**
 * Adds an Account of this kind (a Vendor Account gets a Vendor too) and
 * returns it. Pass `id` to pin the Account's id, e.g. to one no log contains.
 */
export async function addAccount(
  database: MarketplaceDatabase,
  email: string,
  kind: schema.AccountKind,
  id?: number,
): Promise<Account> {
  const vendorId =
    kind === "vendor"
      ? (
          await database
            .insert(schema.vendors)
            .values({ name: email })
            .returning({ id: schema.vendors.id })
            .get()
        ).id
      : null;
  const added = await database
    .insert(schema.accounts)
    .values({ id, email, passwordHash: "not a real hash", kind, vendorId })
    .returning({ id: schema.accounts.id })
    .get();
  return (await findAccount(database, added.id))!;
}

/** Every Feedback row recorded. */
export async function feedbackRows(database: MarketplaceDatabase) {
  return database.select().from(schema.feedback).all();
}

/** A Tracker that keeps every issue it is asked to open, and answers with `issueUrl`. */
export function recordingTracker(
  issueUrl?: string,
): Tracker & { issues: TrackerIssue[]; onlyIssue(): TrackerIssue } {
  const issues: TrackerIssue[] = [];
  return {
    issues,
    /** The one issue opened; throws unless exactly one was. */
    onlyIssue() {
      const [issue, ...more] = issues;
      if (!issue || more.length > 0) throw new Error(`expected one issue, got ${issues.length}`);
      return issue;
    },
    async openIssue(issue) {
      issues.push(issue);
      return issueUrl;
    },
  };
}

/** A Tracker that always fails, as GitHub might. */
export const failingTracker: Tracker = {
  async openIssue() {
    throw new Error("GitHub said 502");
  },
};
