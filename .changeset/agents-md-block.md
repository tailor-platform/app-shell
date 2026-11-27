---
"@tailor-platform/app-shell": minor
---

The package now ships its docs at `dist/docs/`, with a guide at `dist/docs/AGENTS.md` that indexes them and lists the house rules, so coding agents can read the docs for the installed version without a skill having to trigger. Point your `AGENTS.md` at the guide with an `@` import (Claude Code, Amp and Gemini CLI load it directly; other agents follow the path):

```md
@node_modules/@tailor-platform/app-shell/dist/docs/AGENTS.md
```

In erp-kit projects, `erp-kit update agents` (erp-kit 0.60.0 and later) adds and maintains this for you. See the new Coding Agents guide for the details.

The `app-shell-patterns` skill no longer carries its own copy of the docs. It reads them from the installed package, and its `references/` folder now holds pointers to the new location. If you keep a copy of the skill in your repo, replace it with the one in the installed package's `skills/` folder.
