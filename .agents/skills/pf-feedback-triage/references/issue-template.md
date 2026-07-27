# Issue template (Phase 5)

Issues are filed in `tailor-inc/platform-planning`. Build title and body in
shell variables (heredoc) so quotes in user content can't break the command;
pass via stdin to `gh issue create --body-file -`.

## Title

```
<TITLE_PREFIX> <one-line summary>
```

Reuse the Discussion's existing title verbatim when it already starts with the
component's `title_prefix` (it usually does). Otherwise prepend the prefix.
Strip the bilingual " / " duplicate down to the first half if the title is

> ~120 chars.

## Body

```markdown
<DISCUSSION BODY — the Details / Proposed Solution / Impact / Environment / Evidence sections, copied through>

---

**Feedback Type:** <TYPE>
**Expected Impact:** <IMPACT>
**Source:** <DISCUSSION_URL>
```

- Carry the Discussion body through largely intact — it already follows the
  feedback template and is the richest context.
- The `Source:` back-link is **mandatory** — it is what Phase 1 dedup and the
  idempotency filter key on.
- Component is conveyed via the project field, not a label, so no component
  label is added to the Issue — **except `tailor-sdk`**, which also gets the
  `SDK` label, since contract members without Project #15 access rely on it.

## Create command

```bash
TITLE=$(cat <<'TITLE'
<title from above>
TITLE
)
BODY=$(cat <<'BODY'
<body from above>
BODY
)

# `tailor-sdk` also gets the `SDK` label so contract members without
# Project #15 access can still find SDK work; other components rely on the
# project field alone.
LABEL_ARGS=()
if [ "$PROJECT_COMPONENT" = "tailor-sdk" ]; then LABEL_ARGS=(--label SDK); fi

if [ "$DRY_RUN" = "1" ]; then
  echo "[DRY-RUN] gh issue create --repo tailor-inc/platform-planning --title \"$TITLE\" ${LABEL_ARGS[*]}"
  ISSUE_URL='<dry-run: no url>'; ISSUE_NODE_ID='<dry-run>'
else
  ISSUE_URL=$(printf '%s' "$BODY" | gh issue create \
    --repo tailor-inc/platform-planning \
    --title "$TITLE" --body-file - "${LABEL_ARGS[@]}")
  # Resolve the Issue node id for the project mutation.
  NUM=$(printf '%s' "$ISSUE_URL" | grep -oE '[0-9]+$')
  ISSUE_NODE_ID=$(gh api graphql \
    -f query='query($n:Int!){repository(owner:"tailor-inc",name:"platform-planning"){issue(number:$n){id}}}' \
    -F n="$NUM" | jq -r '.data.repository.issue.id')
fi
```
