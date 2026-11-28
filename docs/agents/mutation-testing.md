# Mutation testing

Stryker mutates the Factory's rules in `.sandcastle/agent-workflows/` (routing, batching, the spec queue's survey, the pull request bodies, the verdict, the comment filter, publishing screenshots) and reruns their Vitest tests against each mutant. A mutant the tests catch is **killed**. One they miss **survived**: behaviour no test pins down. Run it to check that a rule's tests pin down its behaviour, not just cover its lines. It runs on demand only, outside the pre-commit hook, `npm run check` and CI. Config: `stryker.config.mjs`, whose `mutate` lists every rule that has tests.

## Run it

1. Scope the run to the files you changed:

   ```sh
   npm run test:mutation -- --mutate .sandcastle/agent-workflows/<dir>/<file>.ts
   ```

   For every rule, use `npm run test:mutation -- --incremental`. It reuses earlier results from `reports/mutation/` (gitignored) and reruns only the mutants a change could affect. When you give a rule tests, add its file to `mutate`.

2. Read the score table and the `[Survived]` diffs it prints. The target is a mutation score of **85–90%**. Below 85% the command exits 1.

3. Deal with every survivor (next section), then rerun. You're done when the run exits 0 and every survivor left is a known equivalent.

`# errors` counts mutants the TypeScript checker rejected because they don't compile. They don't count toward the score. A `Timeout` counts as killed, so a run with many timeouts overstates the score. Rerun it with `--concurrency 2` before you trust it.

## Survivors

- **A gap in the tests:** write a test, through the rule's exports, that fails on the mutant's behaviour. It should assert something a caller could see, the same as any other test (CODING_STANDARDS.md, "A rule lives in its own file, with its tests next to it").
- **Equivalent:** the mutant behaves the same as the original, so no test can kill it. Prefer simplifying the code so the redundant part is gone. When the code is right as it is, put a disable comment on the line above, naming the mutator and why it's equivalent:

  ```ts
  // Stryker disable next-line ConditionalExpression: equivalent, it only saves a query
  ```

  Keep the comment as narrow as that: one line, one mutator. "Don't weaken the mutation check" in CODING_STANDARDS.md covers what isn't allowed.
