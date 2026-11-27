// What a review's verdict, /tmp/review-verdict.md, comes to:
//
//   pass                both axes, `## Standards:` and `## Spec:`, say PASS.
//   changes-requested   either says CHANGES REQUESTED. The Ticket and the
//                       pull request are marked blocked: a person decides.
//   none                there is no `## Standards:` heading, so the run
//                       wrote no verdict (it broke, and the file holds the
//                       workflow's note). The pull request stays a draft.
//
// Only the axes' headings count, never what the reasoning under them says.
export type Outcome = "pass" | "changes-requested" | "none";

const HAS_VERDICT = /^## Standards:/m;
const ASKS_FOR_CHANGES = /^## (Standards|Spec):\s*CHANGES REQUESTED/im;

export const verdictOutcome = (verdict: string): Outcome => {
  if (!HAS_VERDICT.test(verdict)) return "none";
  return ASKS_FOR_CHANGES.test(verdict) ? "changes-requested" : "pass";
};
