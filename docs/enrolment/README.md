# Enrolling a repo

How the Owner makes a repo an Enrolled repo, so the Factory can work on it, and how to rotate the secrets every Enrolled repo holds. The terms are the glossary's ([GLOSSARY.md](../../GLOSSARY.md)), and the reasons are in [ADR-0002](../adr/0002-every-ticket-lives-in-the-home-repo.md) (every Ticket lives in the Home repo), [ADR-0003](../adr/0003-agent-jobs-run-in-each-enrolled-repo.md) (agent jobs run in each Enrolled repo) and [ADR-0004](../adr/0004-factory-and-feedback-act-as-github-apps.md) (the two GitHub Apps).

The Home repo is `trenddreamer/ship-it`. Below, `<name>` is the short name for the repo's `repo:` label, e.g. `marketplace`, and `owner/name` is the repo itself.

## How a Ticket reaches an Enrolled repo

Knowing the path makes each step's purpose plain:

1. A Ticket in the Home repo gets an `agent:*` label, e.g. `agent:explore`.
2. The Home repo's routing job reads the Ticket's `repo:` label and looks it up in the Registry. If the label is missing, doubled or not listed, the Factory refuses the Ticket: it says why in a comment and marks it `agent:blocked`.
3. The routing job starts the Enrolled repo's caller workflow, `factory.yml`, with the task and the Ticket.
4. The caller workflow calls the shared Factory workflows in the Home repo at `main`, passing its Contract and its secrets. The agent job runs there, inside the Enrolled repo, as the Factory App.
5. The results go back onto the Ticket in the Home repo, and any pull request opens in the Enrolled repo.

## Before the first repo (once)

The Home repo needs these whatever repos are enrolled. They are already done for `ship-it`; check them if anything is rebuilt.

- **The Factory App** exists and is installed on the Home repo, and the Home repo holds its secrets `FACTORY_APP_ID` and `FACTORY_APP_PRIVATE_KEY`. The routing job and the spec queue use them. `scripts/set-factory-secrets.sh trenddreamer/ship-it` sets them.
- **Access to the shared workflows.** While the Home repo is private, other repos can only call its workflows, and the actions they use, if it allows them to. In the Home repo: **Settings → Actions → General → Access**, choose **"Accessible from repositories owned by the 'trenddreamer' user"**, and save. Without it, every caller workflow fails at once, before any job starts. This only works for private repos, so every Enrolled repo must be private too.
- **The `agent:*` labels** exist in the Home repo: `agent:explore`, `agent:implement`, `agent:review` and `agent:implement-spec`. The Factory creates the rest (`agent:in-progress`, `agent:blocked`, `agent:queued`, `agent:built`, `spec:<n>`) when it first needs them.

## The steps

Do them in order. The Factory can't reach the repo until steps 1 to 3 are all done, and must not be pointed at it until step 5 is.

### 1. Add the repo to the Registry, with its `repo:` label

**What it does:** the Registry is the list of Enrolled repos. The routing job refuses a Ticket whose `repo:` label isn't in it, so a typo can't send the Factory into a repo that isn't enrolled.

- In the Home repo, add an entry to `repos.yml`, in a pull request like any other change:

  ```yaml
  - label: repo:<name>
    repo: owner/name
  ```

  The routing job reads `repos.yml` from the Home repo's `main`, so the entry counts once the pull request is merged.

- Create the label in the Home repo, so Tickets can carry it:

  ```sh
  gh label create "repo:<name>" -R trenddreamer/ship-it --description "Tickets for owner/name"
  ```

### 2. Add the repo to the Factory App's installation

**What it does:** the Factory acts as its own GitHub App, and can only get a token for repos the App is installed on. This is the second gate: the Factory reaches a repo only when both the Registry and the installation include it. Removing the repo from the installation cuts the Factory off at once.

- On GitHub: your avatar → **Settings → Applications → Installed GitHub Apps**, then **Configure** next to the Factory App.
- Under **Repository access**, keep **Only select repositories**, add `owner/name`, and **Save**. Don't switch to "All repositories".
- In the Enrolled repo, **Settings → Actions → General → Actions permissions** must allow reusable workflows and actions from `trenddreamer/ship-it`. The default, "Allow all actions and reusable workflows", does. If the repo limits which actions it allows, add `trenddreamer/ship-it/.github/workflows/*` and `trenddreamer/ship-it/.github/actions/*`.

Each token a run in the Enrolled repo mints covers one repo, because a token's permissions apply to every repo it covers: the Home repo's (the Tickets, the agent scripts, and dispatching the Home repo's own workflows), and, for the runs that push, the Enrolled repo's (pushing and the pull request, never Actions). So a run in an Enrolled repo other than the Home repo itself can't write the Home repo's code, and can't start the Enrolled repo's caller workflow around the Registry. The Home repo shares its workflows only with repos owned by `trenddreamer` (the Access step under "Before the first repo"), so an Enrolled repo must belong to the `trenddreamer` account.

### 3. Add the caller workflow with its Contract, and set its secrets

**What it does:** the caller workflow is how the Factory runs inside the repo. It is a few lines that hand each task to the shared Factory workflows in the Home repo. Its inputs are the repo's Contract, which tells the Factory how to install the repo, seed it and check a change. The secrets let it run Claude and act as the Factory App.

- Copy [`factory.yml`](./factory.yml) to the Enrolled repo as `.github/workflows/factory.yml`, and merge it to the default branch. The name and the branch both matter: the routing job starts `factory.yml` on the default branch, and nothing else.
- Change the Contract in each of its four jobs. All three are shell commands, run at the repo's root on `ubuntu-latest` with Node 22 already set up:

  | Input     | What the Factory does with it                                                                               | The Marketplace's                       |
  | --------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- |
  | `install` | Installs the repo from a fresh checkout, before every task. It installs any other toolchain the repo needs. | `npm ci`                                |
  | `seed`    | Sets up and seeds the database, after install, before implement, review and build. `true` if there is none. | `npm run db:migrate && npm run db:seed` |
  | `check`   | The checks a change must pass. Implement, review and build give it to the agent and run it on its work.     | `npm run check`                         |

  Leave everything else as it is. The other inputs (`task`, `tickets`, `ticket`, `pr`, `spec`) are filled in by the routing job.

- Set the secrets. In a checkout of the Home repo that has the new Registry entry:

  ```sh
  scripts/set-factory-secrets.sh owner/name
  ```

  It asks for the Claude token (`CLAUDE_CODE_OAUTH_TOKEN`), the Factory App's ID (`FACTORY_APP_ID`) and the path to its private key's `.pem` file (`FACTORY_APP_PRIVATE_KEY`), from your password manager. It sets all three on the repo and prints none of them. Add `--dry-run` first to see what it would set. The caller workflow passes these three to the shared workflows by name, never all the repo's secrets, and the agent itself never sees the App's private key.

### 4. Give the repo a `CLAUDE.md`

**What it does:** every agent reads the repo's `CLAUDE.md` first. It is how the Factory learns the repo's stack, commands and rules, since each repo describes itself.

At the repo's root, it covers at least:

- the stack, and where things live;
- the commands, the same ones as the Contract: how to install, seed and run the checks;
- the rules a change must follow, or links to them, e.g. coding standards and how tests are written;
- where the repo's domain terms are, if it has a glossary.

Every Ticket lives in the Home repo, so it shouldn't send agents to the repo's own issue tracker.

### 5. Bring its CI within the lean-CI rules

**What it does:** every private repo on the account shares the same 2,000 free Actions minutes a month, and so does the Factory. One repo's wasteful CI can stop the Factory everywhere until the month resets. Keep the repo's CI to [the lean-CI rules](#the-lean-ci-rules) before the Factory starts opening pull requests there, because every Factory pull request runs the repo's CI too.

Keep the `factory-evidence` branch out of CI and deploys too. The Factory commits its agents' screenshots there, so they can show inline on Tickets and pull requests ([ADR-0004](../adr/0004-factory-and-feedback-act-as-github-apps.md#screenshots)), and every one of those commits is a push:

- No workflow may run on a push to every branch. CI on `pull_request` alone, as the lean-CI rules ask, is already fine.
- A host that deploys every branch must skip it. For Vercel, in the repo's `vercel.json`:

  ```json
  "git": { "deploymentEnabled": { "factory-evidence": false } }
  ```

### 6. Point any feedback button at the Home repo, with the repo's `repo:` label

**What it does:** Feedback from someone using the app becomes a Ticket in the Home repo, already carrying the repo's `repo:` label and `agent:explore`, so it routes and gets explored like any other Ticket. It is filed by the Feedback App, which can only open issues in the Home repo, so a compromised app server can't touch any code.

Skip this step if the app has no feedback button. If it has one, it files Feedback the way the Marketplace does (`app/modules/feedback/`), with these settings in the app server's environment (for the Marketplace, Vercel's environment variables):

| Setting                        | Value                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FEEDBACK_APP_ID`              | The Feedback App's ID, from its settings page.                                                                                                        |
| `FEEDBACK_APP_PRIVATE_KEY`     | A private key for the Feedback App, as PEM on one line, with `\n` for each line break.                                                                |
| `FEEDBACK_APP_INSTALLATION_ID` | The ID of the Feedback App's installation on the Home repo: the number at the end of its **Configure** page's URL, `.../settings/installations/<id>`. |
| `FEEDBACK_GITHUB_REPO`         | `trenddreamer/ship-it`, the Home repo. That is the default.                                                                                           |
| `FEEDBACK_REPO_LABEL`          | `repo:<name>`, the label from step 1.                                                                                                                 |

The Feedback App stays installed on the Home repo only. Don't add the Enrolled repo to it. Without the first three settings, Feedback is only logged on the server, which is what local development and the checks want.

## Checking the enrolment

Open a small Ticket in the Home repo with the `repo:<name>` label, then add `agent:explore`. Within a few minutes:

- a run of **Factory** starts in the Enrolled repo's Actions tab;
- the Ticket gets the Factory's findings as the Factory App's bot, with a link to that run.

If nothing starts, look at the run of **Agent — Route The Tickets** in the Home repo, and at the comment it left on the Ticket.

## The lean-CI rules

Every Enrolled repo's own CI keeps to these:

1. **No CI on push to main that repeats the PR's checks.** Run the checks on pull requests only (`on: pull_request`). Merging a pull request that has passed them doesn't run them again. Deploys belong to the host, such as Vercel, not to a CI run on main.
2. **Superseded PR runs are cancelled.** A new push to a pull request cancels the run still going for its earlier push:

   ```yaml
   concurrency:
     group: ci-${{ github.ref }}
     cancel-in-progress: true
   ```

3. **No one-minute jobs for trivial checks.** GitHub bills every job by the minute, rounded up, so a five-second lint job costs a whole minute. Run the checks as steps in one job, not one job each.

The Home repo's own CI, `.github/workflows/ci.yml`, keeps to all three.

## Pruning the screenshots

Each Enrolled repo's `factory-evidence` branch only grows, one folder per run that took screenshots, and a full clone of the repo fetches it. When it gets too big, delete it:

```sh
gh api -X DELETE repos/owner/name/git/refs/heads/factory-evidence
```

The next run with screenshots starts it again. Every comment and pull request that showed an image from it then shows a broken image instead.

## Rotating the secrets

Each Enrolled repo holds its own copy of the Claude token and the Factory App's ID and private key, because a personal account has no account-wide secrets. The Home repo holds the App's two. Rotating one means updating every repo, which the script does in one go:

```sh
scripts/set-factory-secrets.sh            # every repo in the Registry, and the Home repo
scripts/set-factory-secrets.sh owner/name # just one of them
```

It asks for each value. **Leave a value blank to keep that secret as it is**, e.g. to rotate only the Claude token. It reads the Registry from `repos.yml` in your checkout, so pull the Home repo's `main` first. Add `--dry-run` to see which secrets it would set on which repos, without setting any. You need `gh`, signed in as the Owner.

- **The Claude token** (`CLAUDE_CODE_OAUTH_TOKEN`): make a new one with `claude setup-token`, then run the script and paste it at the first prompt. It is read without being shown.
- **The Factory App's private key** (`FACTORY_APP_PRIVATE_KEY`): on the Factory App's settings page, **Generate a private key**, which downloads a `.pem` file. Run the script and give that file's path at the third prompt. Once it has finished, delete the old key on the same page, store the new one in your password manager, and delete the downloaded file. Runs already going keep working, since their tokens were minted before.
- **The Feedback App's private key** isn't an Actions secret, so the script doesn't set it. Generate a new key on the Feedback App's settings page, set it as `FEEDBACK_APP_PRIVATE_KEY` wherever each app server runs (step 6), redeploy, then delete the old key.
