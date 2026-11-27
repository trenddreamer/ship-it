// A comment on an issue, as GitHub's REST API returns it
// (`GET /repos/{owner}/{repo}/issues/{n}/comments`), cut down to the fields
// read here. REST, not `gh issue view --json`: only REST gives a bot's full
// `<slug>[bot]` login and its `Bot` type. `gh` shows the bare slug, which a
// person's account could share.
export type IssueComment = {
  user: { login: string; type: string } | null;
  author_association: string;
  created_at: string;
  body: string;
};

export type SteeringComment = {
  author: string;
  createdAt: string;
  body: string;
};

const WRITE_ACCESS = ["OWNER", "MEMBER", "COLLABORATOR"];

// Every status line the Factory posts ("Building", "run failed") carries it.
const STATUS_MARKER = "<!-- factory:status -->";

const mayAdvise = (
  user: NonNullable<IssueComment["user"]>,
  association: string,
  factoryBot: string,
): boolean =>
  user.type === "Bot" ? user.login === factoryBot : WRITE_ACCESS.includes(association);

// The comments on a Ticket that reach an agent. A person's comment counts
// when they have write access to the repo. A bot's counts only when it is
// the Factory's own (`factoryBot`, its `<slug>[bot]` login): GitHub gives an
// App's comments CONTRIBUTOR or NONE, so without that rule explore's findings
// would never reach the implementer. Any other bot, the Feedback App's above
// all, is never trusted. The Factory's status lines are dropped whoever
// posted them.
export const steeringComments = (comments: IssueComment[], factoryBot: string): SteeringComment[] =>
  comments.flatMap(({ user, author_association, created_at, body }) =>
    user && mayAdvise(user, author_association, factoryBot) && !body.includes(STATUS_MARKER)
      ? [{ author: user.login, createdAt: created_at, body }]
      : [],
  );
