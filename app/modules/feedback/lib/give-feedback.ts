import { feedback } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";
import type { Account } from "~/modules/accounts";
import { feedbackIssue } from "./issue";
import { feedbackTextLength } from "./text-length";
import type { Tracker } from "./tracker";

const { min: minLength, max: maxLength } = feedbackTextLength;

export type GiveFeedback = {
  /** The signed-in Account giving it. */
  account: Account;
  /** What they typed, exactly. */
  text: string;
  /** The path of the page the Feedback was given on, e.g. `/subscriptions`. */
  page: string;
  /** The commit the Marketplace is running, already formatted, e.g. `d9233d3 (local changes not on main)`. */
  commit: string;
};

export type FeedbackResult =
  { kind: "sent"; issueUrl?: string } | { kind: "invalid"; reason: string } | { kind: "failed" };

/**
 * Sends Feedback to the Factory through the tracker, then records who gave
 * it and when. The text, trimmed, must be 10–2,000 characters. When it isn't,
 * or the tracker fails, nothing is recorded; a tracker's error is logged, not
 * retried.
 */
export async function giveFeedback(
  database: MarketplaceDatabase,
  tracker: Tracker,
  input: GiveFeedback,
): Promise<FeedbackResult> {
  const length = input.text.trim().length;
  if (length < minLength) {
    return { kind: "invalid", reason: `Write at least ${minLength} characters.` };
  }
  if (length > maxLength) {
    return {
      kind: "invalid",
      reason: `Keep it to ${maxLength.toLocaleString("en-US")} characters or fewer; it's ${length.toLocaleString("en-US")}.`,
    };
  }
  let issueUrl: string | undefined;
  try {
    const { account, text, page, commit } = input;
    issueUrl = await tracker.openIssue(feedbackIssue({ kind: account.kind, text, page, commit }));
  } catch (error) {
    console.error("Feedback couldn't be sent to the tracker:", error);
    return { kind: "failed" };
  }
  await database.insert(feedback).values({ accountId: input.account.id });
  return issueUrl === undefined ? { kind: "sent" } : { kind: "sent", issueUrl };
}
