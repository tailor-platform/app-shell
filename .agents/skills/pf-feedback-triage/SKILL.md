---
name: pf-feedback-triage
description: Reverse of platform-feedback — read untriaged "Platform Feedback" Discussions from tailor-professional-service/knowledge, triage them in one batch-approval pass, and file routed Issues into tailor-inc/platform-planning, added to Project #15 (Tailor Platform) or Project #17 (ERP Kit Modules) with the right Component/Module field. Use when the user wants to triage platform feedback discussions, turn feedback into issues, "triage discussions", "file issues from feedback", or "/pf-feedback-triage".
---

# Platform Feedback Triage

Inverse of `platform-feedback`. That skill files Discussions; this one reads
them and files routed Issues. Run periodically.

## Arguments

- `--dry-run` — execute every phase but replace all mutations with `echo "[DRY-RUN] ..."`.
- `--since YYYY-MM-DD` — lower bound for Discussion `updatedAt`; default 14 days ago.

## Workflow

```
SETUP → FETCH → CLASSIFY → DEDUP → BATCH TABLE (one approval)
      → FILE issues → ADD to project → MARK discussions triaged
```

## Phase 0: Setup

- `gh auth status`. Mutations need `repo` + `project` scopes; on later 403,
  suggest `gh auth refresh -s repo,project`.
- Parse `--dry-run` → `DRY_RUN`, `--since` → `SINCE` (default: 14 days ago).
- Load `COMPONENTS` from `../../team-ps/platform-feedback/references/components/*.md`,
  parsing `label`, `title_prefix`, `project`, `project_component`, and
  `extra_section` from frontmatter. Abort if zero load.
- Re-resolve option IDs for both boards (Component on project 15, Module on
  project 17) — see `references/project-routing.md`.
- Ensure the `pf-triaged` label exists in the knowledge repo:
  `gh label create pf-triaged --repo tailor-professional-service/knowledge -c '#5319e7' -d 'Triaged into platform-planning' 2>/dev/null || true`
  (skip silently if it already exists or creation is denied — fall back to
  back-link-only idempotency).

## Phase 1: Fetch

Per `references/discussion-fetch.md` Fetch + Filter. Produce the list of
untriaged Discussions. Tolerate zero results — exit cleanly with a scan summary.

## Phase 2: Classify

Per `references/discussion-fetch.md` Classify + Parse. Each Discussion gets
`{component, project, project_component, module, impact, type}` or
`needs-component`. The `project` field (15 or 17) decides the target board:
project-15 components route by Component (`project_component`); the
`erp-kit-module` component routes to project 17 by `module` (captured `### Module`
value, or reclassified from `[erp-kit]` backlog — may be `needs-module`).

## Phase 3: Dedup

For each Discussion, search the target repo (sanitize keywords per
`../../team-ps/platform-feedback/references/github-scan.md` — allowlist tokens, assemble in a
shell var, pass via `--`):

```bash
gh search issues --repo tailor-inc/platform-planning -- "$KEYWORDS" --limit 5
```

plus an exact back-link search for the Discussion URL. Classify each row
`new` / `link-existing` / `duplicate`.

## Phase 4: Batch table + single approval

Render one table: `# | discussion | prefix | → board (proj 15 Component / proj 17 Module) | dedup | proposed title`.
For project-17 rows show the proposed Module (e.g. `proj17 · Module=inventory`).
Present it and ask for a single approval. Accept free-text per-row overrides:
`skip N`, `component for N = <opt>`, `project N = 17`, `module for N = sales`,
`link N → #<issue>`. Rows still `needs-component` after input are skipped with a
note; `needs-module` rows still file to project 17 with Module left unset (noted).
"Nothing to file" is a valid outcome — exit cleanly.

**[critical]** Never file without explicit approval. `--dry-run` still proceeds
to later phases but every mutation is an echo.

## Phase 5: File issues

For each approved `new` row, create the Issue per `references/issue-template.md`
(title, body with mandatory `Source:` back-link, via `--body-file -`). For
`link-existing` rows, reuse the existing Issue URL/node-id; skip creation.

## Phase 6: Add to project

Per `references/project-routing.md`, branch on the row's `project`:

- **project 15** (sdk / erp-kit / app-shell / platform-general / others):
  `addProjectV2ItemById` to project 15, set Component (`project_component` →
  option id), set Level = `Task`.
- **project 17** (erp-kit-module): `addProjectV2ItemById` to project 17, set
  Module (`module` → option id); skip if `needs-module`. No Level field.

Leave Status (and project 17's Module Status) unset. A per-row failure is
collected and reported at the end; it does not abort the batch.

## Phase 7: Mark discussions triaged

Only when the Issue was created/linked AND added to the project successfully.
Like Phases 5 and 6, these mutations are echoed under `--dry-run`, never run.

```bash
if [ "$DRY_RUN" = "1" ]; then
  echo "[DRY-RUN] addDiscussionComment discussionId=$DISCUSSION_ID body=\"Filed as $ISSUE_URL\""
  echo "[DRY-RUN] add pf-triaged label to discussion $DISCUSSION_ID"
else
  gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{url}}}' \
    -f id="$DISCUSSION_ID" -f body="Filed as $ISSUE_URL"
  # Add pf-triaged label (resolve its labelable id once; skip if label absent).
fi
```

## Summary

Print: scanned N, filed F, linked L, skipped S, failures (with reasons).

## Safety [critical]

- All user content via `-f` / stdin / `--`; never spliced into query strings or shell-quoted args.
- Every phase tolerates zero results.
- `--dry-run` → no GitHub side effects.
