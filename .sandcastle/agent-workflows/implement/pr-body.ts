// What the implement workflow needs to finish the pull request's body: the
// Home repo the Ticket lives in (`owner/name`), the Ticket's number there,
// and the run that built it.
export type Footing = { home: string; ticket: number; runUrl: string };

// The pull request's body: the agent's summary, then the Factory's footer.
// The footer names the Ticket in its cross-repo form, `owner/name#n`, so that
// merging the pull request in the Enrolled repo closes the Ticket in the Home
// repo (ADR-0002). GitHub honours it only on a pull request into the default
// branch.
export const prBody = (agentBody: string, { home, ticket, runUrl }: Footing): string =>
  [
    agentBody.trimEnd() || "Built by the Factory's implementer.",
    "",
    "---",
    "",
    `Closes ${home}#${ticket}. Built unattended by [this run](${runUrl}).`,
    "The reviewer has been asked to read it. It stays a draft until the verdict is posted.",
    "",
  ].join("\n");
