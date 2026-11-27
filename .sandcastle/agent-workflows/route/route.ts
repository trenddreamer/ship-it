// The Registry, `repos.yml` at the root of the Home repo, as JSON: each
// Enrolled repo (`owner/name`) with the `repo:` label that routes Tickets to
// it. See ADR-0002.
export type Registry = { repos: { label: string; repo: string }[] };

// Where a Ticket goes: the Enrolled repo the Factory works on for it, or why
// it won't. A refusal is written for the Owner, and posted on the Ticket.
export type Route = { repo: string } | { refusal: string };

const REPO_LABEL = "repo:";

const UNKNOWN_REPO = "so the Factory doesn't know which repo it is for.";

// Routes a Ticket by its labels. Exactly one `repo:` label, listed in the
// Registry, gives that label's Enrolled repo. No `repo:` label, more than
// one, or one the Registry doesn't list is refused, each with its reason.
// Every other label (`agent:*`, `bug`, `spec:<n>`) plays no part.
export const route = (labels: string[], registry: Registry): Route => {
  const repoLabels = labels.filter((label) => label.startsWith(REPO_LABEL));
  const [label, ...others] = repoLabels;

  if (label === undefined) {
    return {
      refusal:
        `It has no \`${REPO_LABEL}\` label, ${UNKNOWN_REPO} ` +
        "Add the label of one repo in the Registry (`repos.yml`).",
    };
  }
  if (others.length > 0) {
    const named = repoLabels.map((l) => `\`${l}\``).join(", ");
    return {
      refusal:
        `It has more than one \`${REPO_LABEL}\` label (${named}), ${UNKNOWN_REPO} ` +
        "Keep only the one it is for.",
    };
  }

  const enrolled = registry.repos.find((entry) => entry.label === label);
  return enrolled
    ? { repo: enrolled.repo }
    : {
        refusal:
          `Its label \`${label}\` isn't in the Registry (\`repos.yml\`), ` +
          "so the Factory won't work on it. Fix the label, or enrol the repo first.",
      };
};
