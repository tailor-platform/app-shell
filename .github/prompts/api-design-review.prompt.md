---
description: "Review local package changes using the shared AppShell code-review guidance. Use when: reviewing local changes before pushing, checking packages/ changes locally."
agent: "API Design Reviewer"
---

# Local Package Code Review

Review local package changes against the shared AppShell package-review guidance.

## How to Obtain the Diff and PR Context

First, find the PR for the current branch using GitHub MCP tools. If a PR exists, use MCP tools to gather the diff. If no PR exists, fall back to terminal commands.

### Step 1: Find the PR

Use `mcp_github_list_pull_requests` with the `head` parameter set to `"{owner}:{branch}"` (get the current branch name via `git branch --show-current` in the terminal).

### If a PR exists

1. **Get the changed files with patches**: Use `mcp_github_pull_request_read` with `method: "get_files"`. This returns both the file list and per-file diffs (patches) — this is the **only diff data you need**. Immediately filter to changed implementation under `packages/**`, plus changed package entrypoints/exports. If no matching package files remain, stop — there are no package-review changes.
2. **Do NOT call `get_diff`** — it returns the same diff data already included in `get_files` and would duplicate context.
3. **Do NOT fetch PR comments or review comments upfront.** Only fetch them (via `get_comments` or `get_review_comments`) if you encounter an ambiguous design decision during review that needs clarification from the PR discussion.

### If no PR exists (fallback)

Use terminal commands to obtain the diff locally:

- `git diff main -- 'packages/**'` for changes against `main`
- if `main` is unavailable, `git diff HEAD~1 -- 'packages/**'`

If the diff against `main` is empty, stop — there are no package-review changes.

## How to Read Context

When you need to trace code paths or verify exports:

- Use file search and read tools to inspect referenced files in the workspace.
- Check package entrypoints such as `packages/*/src/index.ts`, `package.json` `exports`, and style entrypoints.
- Follow type/function references through the codebase to evaluate impact.
- Apply the shared rubric imported with the reviewer agent, including public-contract checks for exported changes and cross-cutting React/accessibility/component-design concerns.

## Output

After reviewing, present findings sorted by severity (High → Medium → Low) using the format and severity levels defined in the shared package-review rubric. If there are no issues, state that explicitly.
