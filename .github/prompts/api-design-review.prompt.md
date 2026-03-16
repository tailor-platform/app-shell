---
description: "Review local code changes for API design consistency using the API Design Reviewer agent. Use when: reviewing local changes before pushing, checking packages/ changes locally."
agent: "API Design Reviewer"
---

# Local API Design Review

Review local code changes against the API design principles defined in this project.

## How to Obtain the Diff and PR Context

First, find the PR for the current branch using GitHub MCP tools. If a PR exists, use MCP tools to gather the diff. If no PR exists, fall back to terminal commands.

### Step 1: Find the PR

Use `mcp_github_list_pull_requests` with the `head` parameter set to `"{owner}:{branch}"` (get the current branch name via `git branch --show-current` in the terminal).

### If a PR exists

1. **Get the changed files with patches**: Use `mcp_github_pull_request_read` with `method: "get_files"`. This returns both the file list and per-file diffs (patches) — this is the **only diff data you need**. Immediately filter to files matching `packages/**/*.ts`, `packages/**/*.tsx`, and `packages/**/package.json`. If no files match, stop — there are no API-relevant changes.
2. **Do NOT call `get_diff`** — it returns the same diff data already included in `get_files` and would duplicate context.
3. **Do NOT fetch PR comments or review comments upfront.** Only fetch them (via `get_comments` or `get_review_comments`) if you encounter an ambiguous design decision during review that needs clarification from the PR discussion.

### If no PR exists (fallback)

Use terminal commands to obtain the diff locally:

- `git diff main -- 'packages/**'` for changes against `main`
- `git diff HEAD~1 -- 'packages/**'` for the last commit

Focus only on files matching `packages/**/*.ts`, `packages/**/*.tsx`, and `packages/**/package.json`.

## How to Read Context

When you need to trace code paths or verify exports:

- Use file search and read tools to inspect referenced files in the workspace.
- Check `packages/core/src/index.ts` for public API exports.
- Follow type/function references through the codebase to evaluate impact.

## Output

After reviewing, present findings sorted by severity (High → Medium → Low) using the format and severity levels defined in the agent's review guidelines. If there are no issues, state that explicitly.
