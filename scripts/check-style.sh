#!/usr/bin/env bash
# Rejects a commit when a staged file isn't formatted with Prettier or fails
# Oxlint. Both are fast enough for the hook's 3-second budget: on every file
# in the repo they took about 1.1 s and 0.6 s.
#
# They read the file in the working tree, not the staged copy. When you have
# staged part of a file, the check sees all of it.
set -euo pipefail

# Staged files that were added, copied or modified (not deleted).
staged=()
while IFS= read -r -d '' path; do
  staged+=("$path")
done < <(git diff --cached --name-only -z --no-renames --diff-filter=ACM)

(( ${#staged[@]} == 0 )) && exit 0

code=()
for path in "${staged[@]}"; do
  case "$path" in
    *.ts | *.tsx | *.js | *.jsx | *.cjs | *.mjs) code+=("$path") ;;
  esac
done

failed=0

# --ignore-unknown skips files Prettier has no parser for. .prettierignore
# applies to these paths too.
if ! npx --no-install prettier --check --ignore-unknown --log-level warn "${staged[@]}"; then
  echo >&2
  echo "pre-commit: Prettier would reformat the files above. Run \`npm run format\`, stage the result and commit again." >&2
  failed=1
fi

if (( ${#code[@]} > 0 )) && ! npx --no-install oxlint --deny-warnings "${code[@]}" >&2; then
  echo >&2
  echo "pre-commit: Oxlint found the problems above. Fix them (\`npx oxlint --fix\` fixes some), stage the result and commit again. Don't silence a rule to get the commit through." >&2
  failed=1
fi

exit "$failed"
