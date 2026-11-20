---
name: local-review
description: >
  Substantively review the current branch's PR using the code-review skill and publish
  the report as a PR comment. Use when the user invokes local-review or the PR creation
  workflow requests it. Completion requires both review and publication; no separate
  request to post the report is needed.
compatibility: Requires Node.js 24, Git, and an authenticated gh CLI with permission to comment on the PR.
---

# Local PR Review

Run preparation, review, and publication in the **current agent session**. Do not launch
another agent or write intermediate files. Invoking this skill requests both the review
and its PR report: do not ask for another publication confirmation. Do not modify code,
commit, push, create a PR, or change repository settings as part of this skill.

Run commands from the repository root; no PR number is required.

**Required review:** execute [code-review](../code-review/SKILL.md) substantively before
marking the review complete or publishing. Reading a diff for a commit/PR description,
opening files, or passing tests/CI is not a substitute. If this review has not happened,
is incomplete, or cannot be performed, stop and report that fact to the user. Do not set
`completed: true`, invent an empty `findings` array, or claim `No findings.` as a fallback.
An existing report is not a substitute for performing the required review.

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

Always read and execute [code-review](../code-review/SKILL.md), including its review
procedure and relevant shared references, for the full PR. This is mandatory even when
no files under `packages/**` changed. Other repository or area guidance may supplement
that review, never replace it. Merely loading the skill does not count as executing it.
Keep review criteria in their existing owning skills/references; this skill owns the
execution and publication procedure, not a second checklist.

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

- `{ "path": "...", "status": "reviewed" }` only after substantive analysis under `code-review`, including when there are no findings.
- `{ "path": "...", "status": "skipped", "reason": "..." }` for an explicit scope limitation.

A completed report may contain intentional skips with reasons; 100% coverage and zero
findings are not requirements. An interruption or execution error is **not** completion:
stop and report the failure instead of turning unfinished work into intentional skips.
Do not invent findings or reviewed status. CI owns routine quality checks; run targeted
checks only when needed to validate a finding, without modifying tracked code.

## 3. Build the review result

The input contract is defined by `validateReport` in
[`scripts/local-review.mjs`](../../../scripts/local-review.mjs). Build one JSON object with
only the following top-level fields:

- `plan`: the unchanged preparation output.
- `review`: an object with these fields:

| Field       | Content                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `completed` | `true`, only after the required substantive `code-review` has finished                                 |
| `files`     | The per-file results above, covering every plan path exactly once                                      |
| `findings`  | Array of findings with `path`, `severity` (`high`, `medium`, or `low`), `message`, and optional `line` |

A finding must refer to a changed path; describe effects in related unchanged code within
its message.
An optional line is a positive line number in the reviewed content; omit it when not
applicable, including deletion findings. An empty `findings` array is valid only after the
required substantive `code-review` is complete and found no issues in the reviewed scope.
Unknown fields are rejected.
Do not include a separate count or coverage percentage: the publisher computes counts.
Use `high` for the most severe issues; `critical` is not accepted. Do not include checks,
limitations, or not-performed sections in the input or comment; CI owns routine checks.
The publisher lists all findings under one heading, ordered high → medium → low, with
🔴 **High**, 🟠 **Medium**, or 🔵 **Low** at the start of each item. File coverage and skip
reasons are retained inside a collapsed section.

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
with `prNumber`, `headSha`, and `commentUrl`. After the required review is complete, publish
even when `findings` is empty. Never call the publisher to manufacture a clean report for
work that was not substantively reviewed. A chat-only summary does not complete this skill.

After successful publication, return the comment URL and a concise findings summary.
Do not rewrite the generated comment manually: its visible text and machine data must
remain consistent.

If publication fails or its outcome is uncertain, report the skill as incomplete. Inspect
the current PR's conversation comments with `gh` before retrying; do not blindly create a
second report. If a matching report from this completed review already exists, return its URL. If the
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

The workflow runs only on PR conversation comment creation, editing, and deletion. Before
any report is posted, the required status is missing, which blocks merging. A new unreviewed
HEAD SHA likewise has no successful status until a fresh report is posted; no PR/push trigger
is needed. Comments on closed PRs are also revalidated so deleting or editing a report does
not leave stale success when the PR is reopened.

A new head commit needs a new review. Base-branch movement alone does not require re-review.
Report edits/deletions trigger revalidation, but revocation is asynchronous and statuses are
commit-scoped, not strictly isolated between PRs sharing a SHA.

This is a declared execution/reporting process, not a signature or proof that an agent
faithfully checked every review criterion. It detects missing/stale reports and incomplete
file accounting; review quality still depends on the agent and human reviewers.
