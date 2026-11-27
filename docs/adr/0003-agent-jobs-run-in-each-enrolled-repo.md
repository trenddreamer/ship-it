# Agent jobs run inside each Enrolled repo, on GitHub-hosted runners

The Home repo holds the Tickets, the Registry and the routing. Agent jobs (explore, implement, review) run inside the Enrolled repo they work on. The Home repo starts them there with `workflow_dispatch`. Each Enrolled repo has a short caller workflow that calls the shared factory workflows in the Home repo at `@main`, and its inputs (`install`, `seed`, `check`) are the repo's Contract.

We chose this because GitHub's terms rule out the obvious alternative, running every agent job in the Home repo on GitHub-hosted runners. The terms forbid, "if using GitHub-hosted runners, any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository where GitHub Actions are used". That applies to private repos as well as public ones. A job in the Home repo building another repo's code is on the wrong side of it. A job inside the repo it builds is not.

Minutes were the other constraint. The account is on GitHub Free, with 2,000 minutes a month for private repos and a budget that stops runs when they are used up, so the cost stays at zero. From November 1 to 27, 2026:

| Usage                                                          | Minutes |
| -------------------------------------------------------------- | ------- |
| All private repos                                              | ~2,000  |
| `midlands-whats-on`                                            | 1,799   |
| ↳ CI, which ran on both the PR and the push to main            | 1,333   |
| `ship-it`'s agent runs, the whole Factory, measured job by job | ~160    |
| `ship-it`'s CI                                                 | ~80     |

The Factory is cheap. What used up the minutes was CI, so trimming CI pays for the Factory.

## Considered Options

- **Agent jobs in the Home repo, on GitHub-hosted runners.** It's the simplest, but it goes against the terms above. The stated penalty runs up to restricting Actions on the account.
- **A self-hosted runner on the Owner's PC.** It costs no minutes and the terms allow it. Against it:
  - It's infrastructure to maintain: Docker, an ephemeral runner that re-registers after each job, a runner App with Administration: write, and runner updates.
  - Nothing runs while the PC is off, and queued jobs give up after about a day.
  - Agent jobs steered by Feedback would run on the Owner's home network.

  It stays the fallback if minutes run short.

- **Oracle Cloud Always Free.** In August 2026 Oracle cut the free ARM allowance to 2 OCPU and 12 GB and disabled instances over it. It also reclaims idle instances, which an idle runner is, and agent-browser's Chrome is untested on ARM.
- **Modal**, with $30 of compute a month free. The Actions job must start the sandbox and exit at once, or it spends minutes waiting, which is the most wiring of any option.
- **Claude Code cloud tasks.** Free compute and built-in GitHub triggers, but they run on the Owner's Claude Team seat, which is a work subscription, and the Factory will become hobby work.
- **A small paid VPS.** A flat monthly fee in dollars for a hobby project.

## Consequences

- **Shared minutes.** The Factory shares the 2,000 minutes with every repo's own CI, so wasteful CI in one repo can stop the Factory everywhere until the month resets. Lean CI is a rule of enrolment:
  - No CI run on push to main that repeats the PR's checks.
  - Superseded PR runs are cancelled.
  - No one-minute jobs for trivial checks.
- **Secrets in every repo.** A personal account has no account-wide secrets, so every Enrolled repo stores the Claude token and the Factory App's private key. Rotating either means updating every Enrolled repo.
- **Token scope.** Each run mints its GitHub App token for the Home repo plus its own repo only, with only the permissions its task needs. A step before the agent mints it, so the agent never sees the App key.
- **One factory version.** Every Enrolled repo calls `@main`, so a factory change reaches every repo on its next run, and a broken change is fixed by reverting it in the Home repo.
- **Run pages.** Each run's page lives in its Enrolled repo, and the Ticket links to it.
