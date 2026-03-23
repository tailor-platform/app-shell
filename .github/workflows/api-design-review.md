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

## Review Round Awareness

This review may be one of multiple rounds on the same PR. Before starting your review:

1. **Check prior review comments** on this PR (both general comments and inline review comments).
2. **Acknowledge resolved issues**: If the author has already addressed a previously raised issue, do NOT re-flag it or flag a variant of it. Consider it resolved.
3. **Focus on what's new**: On subsequent rounds, your primary role is to verify that previously raised issues were adequately addressed. Only flag **new** issues if they are High or Medium severity.
4. **Do not escalate nits**: If prior rounds already covered the important issues and the author has addressed them, do not search for increasingly minor issues to fill the report. Quality over quantity.

## Final Verdict (Required)

Every review MUST end with a clear verdict. Choose one:

| Verdict             | When to use                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Approve**         | No unresolved High or Medium issues. Low-severity suggestions may exist but are not blocking. |
| **Request Changes** | One or more High or Medium issues remain unresolved and require changes before merging.       |

Format your verdict at the end of the review as:

```
**Verdict: [Approve | Request Changes]**
[1-2 sentence summary justifying the verdict]
```

**Convergence rule**: If ALL previously raised High/Medium issues have been addressed by the author and no new High/Medium issues are found in this round, you MUST approve the PR even if Low-severity suggestions remain. Do not block a PR solely on Low-severity issues.

## Safe Outputs

- Use `create-pull-request-review-comment` to post inline review comments on specific lines in the diff.
- If the PR has no issues to flag, use `add_comment` (not `submit_pull_request_review`) to post a brief comment on the PR confirming the review found no issues.
