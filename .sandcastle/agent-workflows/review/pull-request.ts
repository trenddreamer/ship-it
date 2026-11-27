// An open pull request in an Enrolled repo, as `gh pr list --json
// number,body` gives it.
export type OpenPullRequest = { number: number; body: string };

// The Home repo the Ticket lives in, the Enrolled repo the pull requests are
// in (both `owner/name`), and the Ticket's number.
export type Where = { home: string; enrolled: string; ticket: number };

const KEYWORD = String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+`;

const escape = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// The Factory's pull request for a Ticket: the newest open one whose body
// closes it, as GitHub reads a closing keyword. That is how review finds what
// to read when the Owner asks for a review from the Ticket, which says nothing
// of the pull request itself.
//
// The Ticket is in the Home repo, so its reference must name the Home repo,
// as the implementer's footer does (`Closes trenddreamer/ship-it#47`). A bare
// `#47` names an issue in the pull request's own repo, so it counts only when
// that repo is the Home repo.
export const ticketPullRequest = (
  prs: OpenPullRequest[],
  { home, enrolled, ticket }: Where,
): number | undefined => {
  const repo = escape(home);
  const named = home.toLowerCase() === enrolled.toLowerCase() ? `(?:${repo})?` : repo;
  const closes = new RegExp(`${KEYWORD}${named}#${ticket}(?!\\d)`, "i");
  return prs
    .filter(({ body }) => closes.test(body))
    .map(({ number }) => number)
    .toSorted((a, b) => b - a)[0];
};
