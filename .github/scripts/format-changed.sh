#!/usr/bin/env bash
set -euo pipefail

mode=$1
base=${2:-}

if [[ -n "$base" ]] && git cat-file -e "${base}^{commit}" 2>/dev/null; then
  git diff --name-only --no-renames --diff-filter=ACM -z "$base" HEAD
else
  git ls-files -z
fi | xargs -0 -r node node_modules/prettier/bin/prettier.cjs "$mode" --ignore-unknown --
