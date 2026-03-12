---
description: >
  Reviews pull requests for API design consistency, potential footguns,
  and TypeScript/React best practices in the AppShell core package.
on:
  slash_command:
    name: review
    events: [pull_request_comment]
imports:
  - ../agents/api-design-reviewer.md
permissions:
  contents: read
  pull-requests: read
  issues: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request-review-comment:
    max: 10
  noop:
---

# API Design Review

{{#import ../agents/api-design-reviewer.md}}

## Safe Outputs

- Use `create-pull-request-review-comment` to post inline review comments on specific lines in the diff.
- If the PR has no issues to flag, call the `noop` safe output with a message like: "No API design issues found in this PR."
