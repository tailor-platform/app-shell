#!/usr/bin/env bash
#
# Verify UI Catalogue deep links in docs/components/*.md.
#
# The catalogue is a client-side-routed SPA: an unknown path such as
# /components/checkbox is served as HTTP 200 and only renders "404 Not Found"
# after hydration. The lychee step in doc-check.yaml therefore passes on a
# broken deep link, so this checks the one invariant we can assert offline —
# a component page may only link its own slug.
#
# It does NOT detect a slug the catalogue has renamed or dropped upstream. That
# lives in tailor-inc/app-web and would need a headless browser to confirm.
# Re-run the diff in that repo when components are renamed:
#   grep -A1 'defineResource({' ui-catalogue/src/pages/components/resources.tsx
set -euo pipefail

cd "$(dirname "$0")/../../.."

readonly BASE="https://ui.tailor.tech/components/"
status=0

for file in docs/components/*.md; do
  expected=$(basename "$file" .md)

  # Every catalogue component link in this file, as bare slugs.
  while read -r slug; do
    [ -z "$slug" ] && continue
    if [ "$slug" != "$expected" ]; then
      echo "$file: links catalogue slug '$slug', expected '$expected'" >&2
      status=1
    fi
  done < <(grep -oE "${BASE}[a-z0-9-]+" "$file" | sed "s|${BASE}||")
done

if [ "$status" -eq 0 ]; then
  echo "UI Catalogue links OK ($(grep -lE "$BASE" docs/components/*.md | wc -l | tr -d ' ') pages linked)"
fi

exit "$status"
