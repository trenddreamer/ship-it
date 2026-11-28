# The Factory and Feedback each act as their own GitHub App

The Factory acts on GitHub as a GitHub App, `…-factory`, installed on the Home repo and on each Enrolled repo, with read and write access to contents, issues and pull requests, and the right to start workflows. Feedback buttons file Tickets as a second App, `…-feedback`, installed on the Home repo only, with Issues: write and nothing else. Neither uses the Owner's personal token.

## Why a Factory App

- Its commits, PRs and comments show as `…-factory[bot]`, so the Factory's work is always distinguishable from the Owner's.
- The Owner can approve its PRs. GitHub refuses an approval from a PR's author, and under a personal token the Owner authors every Factory PR.
- Tokens it mints, unlike Actions' built-in `GITHUB_TOKEN`, start other workflows. The Factory needs that to chain its runs.
- Enrolling a repo means adding it to the App's installation, and removing it un-enrols the repo.

On GitHub Free, branch protection and rulesets work only on public repos, so on a private repo an approval is recorded but not required. The Factory may merge Two-way door changes itself (see `GLOSSARY.md`). What gates that merge belongs to the task design.

## Screenshots

The agents take screenshots as evidence, and the Owner wants them inline in Tickets and PRs. GitHub's own attachments (`gh --attach`, the upload behind dragging an image into a comment) refuse every GitHub App installation token, whatever its permissions. The upload endpoint answers 404, and GitHub's CLI maintainers call that intended ([cli/cli#14309](https://github.com/cli/cli/issues/14309)). They worked only while the Factory acted through the Owner's personal token.

So the Factory commits each run's screenshots to a branch of their own in the Enrolled repo, `factory-evidence`, in a folder per run, and links to each by its `raw/` URL. GitHub shows those inline to anyone signed in who can read the repo, private or not. The branch is never merged. Publishing is one commit through the Git database API, never a force-push, by `.github/actions/publish-evidence`. A run whose screenshots don't publish still posts, saying which are missing.

What it costs:

- **Explore and decompose gain a write token on the Enrolled repo.** Their agents still never hold it: the screenshots are published from the job after the agent's, which runs no agent and holds Contents: write on the Enrolled repo and nothing else there.
- **The images live in git.** A full clone of the Enrolled repo fetches the branch, which only grows. Deleting the branch prunes it, and breaks the images in every comment that used them.
- **Each push to the branch is a push.** A host that deploys every branch, like Vercel, must ignore `factory-evidence`, and so must any CI that runs on push to every branch (the enrolment steps say how).

Rejected: a person's credentials only for the upload (a machine account's web session, or an App user token, `ghu_`, which acts as the Owner), because it brings back a long-lived personal credential in every Enrolled repo; and hosting outside GitHub, because a private app's screenshots would leave it.

## Why a separate Feedback App

A feedback button runs on a public-facing server, so the credential it holds must be able to do nothing but file issues in the Home repo. The web app mints a short-lived installation token for each submission.

The Factory's workflows decide who may steer a run by `authorAssociation` (`OWNER`, `MEMBER`, `COLLABORATOR`). Under a token belonging to the Owner, Feedback typed by anyone using the app would arrive as the Owner's own words, and the Factory couldn't tell the Owner's instructions from a stranger's text. Under the Feedback App, it arrives from the feedback bot, and the Factory reads it as a description of a problem, never as instructions.

That is a rule in the agents' prompts, not something the system enforces. Feedback goes on from explore to implement like any other Ticket.

## Considered Options

- **The fine-grained personal access token used today.** Everything the Factory does appears as the Owner, the Owner can't approve the Factory's PRs, and Feedback arrives as the Owner's own words.
