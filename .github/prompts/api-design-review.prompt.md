---
description: "Review local code changes for API design consistency using the API Design Reviewer agent. Use when: reviewing local changes before pushing, checking packages/ changes locally."
agent: "API Design Reviewer"
---

# Local API Design Review

Review local code changes against the API design principles defined in this project.

## How to Obtain the Diff and PR Context

First, find the PR for the current branch using GitHub MCP tools. If a PR exists, use MCP tools to gather the diff and review context. If no PR exists, fall back to terminal commands.

### Step 1: Find the PR

Use `mcp_github_list_pull_requests` with the `head` parameter set to `"{owner}:{branch}"` (get the current branch name via `git branch --show-current` in the terminal).

### If a PR exists

1. **Get the list of changed files**: Use `mcp_github_pull_request_read` with `method: "get_files"`. Focus only on files matching `packages/**/*.ts`, `packages/**/*.tsx`, and `packages/**/package.json`.
2. **Get the full diff**: Use `mcp_github_pull_request_read` with `method: "get_diff"`.
3. **Fetch existing PR comments**: Use `mcp_github_pull_request_read` with `method: "get_comments"` to see general discussion.
4. **Fetch inline review comments on the diff**: Use `mcp_github_pull_request_read` with `method: "get_review_comments"` to see code-level review threads.

Use these comments as background information to understand what has already been discussed, what concerns have been raised, and what decisions have been made. Avoid re-flagging issues that have already been resolved or acknowledged in the PR conversation.

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
