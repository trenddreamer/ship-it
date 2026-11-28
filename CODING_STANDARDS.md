# Coding standards

Each rule is a heading. Reviewers cite a rule by its heading. A breach of any rule here is a hard violation, unless the rule says it is a judgement call.

## The Factory's scripts

### A rule lives in its own file, with its tests next to it

`.sandcastle/agent-workflows/` keeps each pure rule (routing, batching, the survey, a pull request's body, the verdict, publishing screenshots) in a file of its own, apart from the CLIs and Sandcastle scripts that do the I/O around it. A rule takes everything it reads as arguments, with `fetch` passed in when it calls GitHub, so its tests can drive it. Its tests sit beside it as `<name>.test.ts` and go through its exports. Give a new rule tests, and add its file to `mutate` in `stryker.config.mjs`.

### A script Node runs as it is uses only TypeScript Node can strip

The workflows run some scripts with plain `node`, with no `npm ci` (e.g. `finish-pr-body.ts`, `evidence-cli.ts`). Such a script imports only Node's builtins and other `.ts` files, with the `.ts` on the path. Node strips types and nothing else, so it fails on syntax that needs compiling: parameter properties (`constructor(readonly status: number)`), enums and namespaces. Vitest compiles them happily, so run a new or changed script with `node` once before committing it.

### Validate what an agent hands back with Zod

A workflow acts on an agent's plan, queue or verdict only after parsing it with its Zod schema (the `*-schema.ts` beside the script). The agent has read untrusted Tickets and code, so its output is input like any other.

## Checks

### Don't weaken the lint or the formatter

Oxlint (`.oxlintrc.json`) and Prettier (`.prettierrc.json`, `.prettierignore`) run in the pre-commit hook and in `npm run check`. A diff must not turn a rule off, lower it to a warning, add an ignore pattern, or add an `oxlint-disable` comment without a reason in the ticket. Fix the code instead. Turning a rule on is fine.

### Don't weaken the mutation check

Mutation testing (`npm run test:mutation`, config `stryker.config.mjs`) targets a score of 85–90% and fails below 85%. A diff must not lower `thresholds`, shrink `mutate`, or raise `concurrency` without a reason in the ticket. More workers make mutants time out, and a timeout counts as killed.

A `// Stryker disable` comment covers one line (`next-line`) and one mutator, and states why the mutant is equivalent. A disable on a whole file or on all mutators, or one with no reason, needs a human's sign-off. A survivor that is a real gap in the tests gets a test, not a disable comment.

## Files

### Files stay under 5,000 tokens

The pre-commit hook (`scripts/check-file-tokens.sh`) rejects any staged file over about 5,000 tokens (bytes / 4) and explains how to split it. Binaries and the paths in `scripts/token-limit-exempt.txt` are exempt: workflows, migrations, lockfiles, vendored skills and generated files. Reviewers check for ways around it that the hook can't see: a file shrunk by minifying, packing lines together or deleting comments and docs, instead of being split along its responsibilities; a file moved to an exempt path to dodge the limit; or a new line in the exempt list without a human's sign-off. Only files nobody splits by hand belong on that list.

### The pre-commit hook stays under 3 seconds

`scripts/pre-commit.sh` runs only fast checks on staged files: file sizes, Prettier and Oxlint. Typecheck, tests, the boundary lint, or anything else that grows with the codebase runs in `npm run check` and CI, never in the hook.
