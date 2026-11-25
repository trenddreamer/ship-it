import type { Account } from "~/modules/accounts";
import type { TrackerIssue } from "./tracker";

const titleLength = 70;

/** Every Feedback issue carries these labels: explore starts at once, and `feedback` stays for good. */
const labels = ["agent:explore", "feedback"];

const sentBy: Record<Account["kind"], string> = {
  customer: "a Customer",
  vendor: "a Vendor",
  admin: "an Admin",
};

/**
 * The issue for one piece of Feedback. The footer says where it came from,
 * but never who: no email address, Account id or name.
 */
export function feedbackIssue(input: {
  kind: Account["kind"];
  text: string;
  page: string;
  commit: string;
}): TrackerIssue {
  const footer = [
    "---",
    `Page: ${input.page}`,
    `Sent by: ${sentBy[input.kind]}`,
    `Commit: ${input.commit}`,
  ];
  return {
    title: `Feedback: ${firstLine(input.text)}`,
    body: `${input.text}\n\n${footer.join("\n")}`,
    labels: [...labels],
  };
}

function firstLine(text: string): string {
  const line = text
    .trim()
    .replace(/\r?\n[\s\S]*/, "")
    .trim();
  return line.length > titleLength ? `${line.slice(0, titleLength).trimEnd()}…` : line;
}
