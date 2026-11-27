// What a build workflow needs to finish the pull request's body: the Home
// repo the Ticket lives in (`owner/name`), the Ticket's number there, and the
// run that built it. `spec` is the spec a queued ticket is part of, for the
// spec queue's builds (factory-implement-spec.yml); a Ticket built on its own
// has none.
export type Footing = { home: string; ticket: number; runUrl: string; spec?: number };

// The pull request's body: the agent's summary, then the Factory's footer.
// The footer names the Ticket, and its spec if it has one, in their
// cross-repo form, `owner/name#n`, so that merging the pull request in the
// Enrolled repo closes the Ticket in the Home repo (ADR-0002), and a bare `#n`
// never points at the Enrolled repo's own issues. GitHub honours `Closes` only
// on a pull request into the default branch.
export const prBody = (agentBody: string, { home, ticket, runUrl, spec }: Footing): string =>
  [
    agentBody.trimEnd() || "Built by the Factory's implementer.",
    "",
    "---",
    "",
    `Closes ${home}#${ticket}.${spec === undefined ? "" : ` Part of ${home}#${spec}.`} Built unattended by [this run](${runUrl}).`,
    "The reviewer has been asked to read it. It stays a draft until the verdict is posted.",
    "",
  ].join("\n");
