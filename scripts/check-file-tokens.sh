#!/usr/bin/env bash
# Rejects a commit when any staged file is over the token budget.
#
# Tokens are estimated cheaply as bytes / 4, which is close enough for
# English text and code. Only the staged version of each added or modified
# file is checked, so an existing large file only trips this when you
# change it. Files matching scripts/token-limit-exempt.txt are skipped.
set -euo pipefail

MAX_TOKENS=5000
BYTES_PER_TOKEN=4
EXEMPT_FILE="scripts/token-limit-exempt.txt"

exempt_patterns=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"                       # drop comments
  line="${line#"${line%%[![:space:]]*}"}"  # trim leading space
  line="${line%"${line##*[![:space:]]}"}"  # trim trailing space
  if [[ -n "$line" ]]; then exempt_patterns+=("$line"); fi
done < "$EXEMPT_FILE"

is_exempt() {
  # (the ${x+...} form keeps an empty list safe under set -u in bash 3.2)
  for pattern in ${exempt_patterns[@]+"${exempt_patterns[@]}"}; do
    # shellcheck disable=SC2053 # pattern is meant to glob
    [[ "$1" == $pattern ]] && return 0
  done
  return 1
}

# Staged, added or modified, non-binary, non-exempt files.
# (--numstat prints "-" for binary files, which aren't read as tokens.)
paths=()
while IFS=$'\t' read -r -d '' added _deleted path; do
  [[ "$added" == "-" ]] && continue
  is_exempt "$path" && continue
  paths+=("$path")
done < <(git diff --cached --numstat -z --no-renames --diff-filter=ACM)

(( ${#paths[@]} == 0 )) && exit 0

# One git call for every size, so the hook stays fast however many files
# are staged.
sizes=()
while IFS= read -r size; do
  sizes+=("$size")
done < <(printf ':%s\n' "${paths[@]}" | git cat-file --batch-check='%(objectsize)')

over=()
for i in "${!paths[@]}"; do
  bytes=${sizes[$i]}
  tokens=$(( (bytes + BYTES_PER_TOKEN - 1) / BYTES_PER_TOKEN ))
  if (( tokens > MAX_TOKENS )); then
    over+=("  ${paths[$i]}  (~$tokens tokens, $bytes bytes)")
  fi
done

(( ${#over[@]} == 0 )) && exit 0

{
  echo "pre-commit: these staged files are over the $MAX_TOKENS-token limit (estimated as bytes / $BYTES_PER_TOKEN):"
  echo
  printf '%s\n' "${over[@]}"
  cat <<'GUIDANCE'

Large files are hard to read, review and load into an agent's context.
Split each one into smaller files along its responsibilities. Don't shrink
it by minifying, deleting comments or docs, packing lines together, adding
it to scripts/token-limit-exempt.txt, or moving it to an exempt path, and
don't bypass this hook.

How to split, by kind of file:

  Entry point of a module (a file at the root of app/modules/<module>/)
    It is doing work that belongs in lib/. Move the implementation into
    lib/ and keep the entry point to the exports callers need. If it
    serves different kinds of caller, split it into several small entry
    points (index.ts, client.ts, server.ts). Never re-export lib/
    wholesale (export * from "./lib/...").

  Implementation in app/modules/<module>/lib/
    Find the separate responsibilities: groups of functions and types that
    use each other but little of the rest. Move each group into its own
    file in lib/ (lib/parse.ts, lib/validate.ts, ...). If the groups are
    different concepts rather than parts of one, the module is really two:
    make a new module under app/modules/ with its own entry points, as
    app/modules/README.md describes.

  Tests in app/modules/<module>/tests/
    One test file per behaviour of the interface (tests/create.test.ts,
    tests/cancel.test.ts, ...). Move shared setup and builders into a
    fixture file in tests/. Tests still import only entry points.

  Other code
    Behaviour outside app/modules/ belongs in a module (see
    CODING_STANDARDS.md, "Behaviour goes in a module, not a route"). Move
    it there, then split as above.

  Markdown and docs
    Split by top-level heading into separate files and link them from a
    short overview that stays in the original file.

  Config and data (JSON, YAML, ...)
    Split into several files where the tool allows it (one fixture per
    scenario), or move large data out of the config into its own file.

Then stage the new files (git add), run npm run check to confirm the
boundaries and tests still pass, and commit again.
GUIDANCE
} >&2
exit 1
