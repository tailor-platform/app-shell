---
name: local-review
description: >
  Review the current branch's PR locally and publish the report as a PR comment.
  Use when the user invokes local-review or the PR creation workflow requests it.
  Completion includes publication; no separate request to post the report is needed.
compatibility: Requires Node.js 24, Git, and an authenticated gh CLI with permission to comment on the PR.
---

# Local PR Review

Run preparation, review, and publication in the **current agent session**. Do not launch
another AI, use OCR, or write intermediate files. Invoking this skill requests both the
review and its PR report: do not ask for another publication confirmation. Do not modify
code, commit, push, create a PR, or change repository settings as part of this skill.

Run commands from the repository root.
For Pi, the explicit invocation is `/skill:local-review`; no PR number is required.

## 1. Prepare the current branch's PR

```bash
node scripts/local-review.mjs prepare
```

Keep the returned stdout JSON object as `plan`, unchanged. It contains the PR identity,
local and remote branch identity, fixed commit SHAs, and every changed file. Preparation
requires a clean worktree, matching local/PR HEAD, and one unambiguous open PR. Diagnostics
go to stderr; a non-zero exit stops this skill. Report the blocker rather than automatically
fetching, committing, pushing, switching branches, or choosing another PR.

Do not replace fixed SHAs with `main`, `HEAD`, or other moving refs. Do not reconstruct the
plan from memory or omit paths to make a large review easier. If context is lost, prepare
and review again instead of publishing an incomplete result.

## 2. Review every listed file

For `packages/**` changes, read [code-review](../code-review/SKILL.md) and the relevant shared
references it links. For other changes, use the applicable repository instructions and
inspect the affected behavior, callers, configuration, tests, and documentation. Keep the
review criteria in their existing owning skills/references; this skill owns the execution
and publication procedure, not a second checklist.

Read the entire relevant diff, in file-sized chunks when needed. The command shape is:

```bash
git --no-pager diff --no-ext-diff --no-textconv --no-color --no-renames \
  <plan.mergeBaseSha> <plan.headSha> -- <path>
```

Pass refs and paths as literal arguments: use the tool's argument interface when available,
otherwise shell-quote each value correctly. Never interpolate a path or report text into
an executable shell expression. Trace related code rather than reviewing only the patch.
Use file-reading/search tools for current code; for content at an exact commit use
`git --no-pager show --no-ext-diff --no-textconv --no-color <sha>:<path>` with the combined
revision/path passed as one quoted argument.

Preparation uses `--no-renames`, so a rename appears as the old deleted path and the new
added path. Account for both. If a file is deleted or absent from the worktree, inspect it
at `plan.mergeBaseSha` rather than silently skipping it. Do not silently exclude generated
files, lockfiles, or changesets: either review them or record a concrete skip reason.

For every `plan.files` entry, record exactly one result:

- `{ "path": "...", "status": "reviewed" }` after checking it, including when there are no findings.
- `{ "path": "...", "status": "skipped", "reason": "..." }` for an explicit scope limitation.

A completed report may contain intentional skips with reasons; 100% coverage and zero
findings are not requirements. An interruption or execution error is **not** completion:
stop and report the failure instead of turning unfinished work into intentional skips.
Do not invent checks, findings, or reviewed status. Run only appropriate checks that do not
modify tracked code, and record checks not performed and their implications.

## 3. Build the review result

The input contract is defined by `validateReport` in
[`scripts/local-review.mjs`](../../../scripts/local-review.mjs). Build one JSON object with
only the following top-level fields:

- `plan`: the unchanged preparation output.
- `review`: an object with these fields:

| Field         | Content                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `completed`   | `true`, only after the review has finished                                                                             |
| `files`       | The per-file results above, covering every plan path exactly once                                                      |
| `findings`    | Array of findings with `path`, `severity` (one of `critical`, `high`, `medium`, `low`), `message`, and optional `line` |
| `checks`      | Array of non-empty strings describing checks actually performed                                                        |
| `limitations` | Array of non-empty strings describing unperformed checks and remaining risks                                           |

A finding must refer to a changed path; describe effects in related unchanged code within
its message.
An optional line is a positive line number in the reviewed content; omit it when not
applicable, including deletion findings. Empty arrays are valid. Unknown fields are rejected.
Do not include a separate count or coverage percentage: the publisher computes counts.

Before publication, sanitize **all** prose fields for public visibility. Do not include
specific company/customer names, credentials, private client context, absolute local paths,
conversation logs, or internal reasoning. Use generic descriptions and repository-relative
paths. The machine-readable data is also public; it is encoding, not encryption.

## 4. Publish automatically

Pass the complete JSON object to this command's stdin:

```bash
node scripts/local-review.mjs publish
```

Use the execution tool's stdin input when available. Otherwise, use a **single-quoted
heredoc** delimiter that does not occur as a standalone line in the JSON. Do not use
unquoted heredocs, `echo` interpolation, or a double-quoted shell string containing the
report. Keep JSON strings properly escaped and do not create temporary report files.

The publisher validates the result, rechecks the local branch and PR HEAD, verifies the
file list against Git, and posts the canonical report through `gh`. It returns stdout JSON
with `prNumber`, `headSha`, and `commentUrl`. Publish even when `findings` is empty. A chat-only
summary does not complete this skill.

After successful publication, return the comment URL, a concise findings summary, and the
important skipped checks/risks. Do not rewrite the generated comment manually: its visible
text and machine data must remain consistent.

If publication fails or its outcome is uncertain, report the skill as incomplete. Inspect
the current PR's conversation comments with `gh` before retrying; do not blindly create a
second report. If the expected current-HEAD report already exists, return its URL. If the
branch or HEAD changed, prepare and review again. Never auto-fix findings as a prerequisite
for publication; changes and a subsequent review are separate work.

## Gate and rollout

[Local Review Gate](../../../.github/workflows/local-review-gate.yaml) checks live comments
and publishes the `local-review/report` commit status on the PR's current HEAD. It accepts
a report from the PR author or a human with repository write/maintain/admin permission.
Bot comments and automation PRs have no implicit exemption; a permitted human can review
an automation PR locally. Existing CI and CODEOWNER approval requirements remain unchanged.

Deploy the script and workflow to the default branch and validate them on a test PR first.
An administrator must then require `local-review/report` in the merge-target Ruleset, with
GitHub Actions as its expected source. Adding a workflow alone does not block merging.
Do not alter Rulesets as part of running this skill.

A new head commit needs a new review. Base-branch movement alone does not require re-review
in this version. Report edits/deletions trigger revalidation, but revocation is asynchronous
and statuses are commit-scoped, not strictly isolated between PRs sharing a SHA.

This is a declared execution/reporting process, not a signature or proof that an agent
faithfully checked every review criterion. It detects missing/stale reports and incomplete
file accounting; review quality still depends on the agent and human reviewers.
