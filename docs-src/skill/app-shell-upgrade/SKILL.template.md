---
name: app-shell-upgrade
description: "Upgrades @tailor-platform/app-shell in a consuming app and fixes what the version bump breaks. Use when: bumping, updating or upgrading @tailor-platform/app-shell (including a Renovate or Dependabot PR), reviewing an app-shell version change, or diagnosing styling, theming, colour, dark-mode, test or type breakage that appeared after one — these breakages are often silent, with a green build and no warning. Lists every change that requires editing the app, with how to detect and fix each. For building or editing screens, use app-shell-patterns."
compatibility: "Requires @tailor-platform/app-shell in the project. Use the copy shipped in the installed package's skills/ directory, so its migration list covers the installed version."
metadata:
  app-shell-version: "{{APP_SHELL_VERSION}}"
---

# App-Shell Upgrade

## Purpose

Move an app from one `@tailor-platform/app-shell` version to another and apply every migration in between.

## Version

This skill was generated from `@tailor-platform/app-shell` **{{APP_SHELL_VERSION}}** and lists migrations up to that version. Resolve `@tailor-platform/app-shell/package.json` from the app you're working on, not a monorepo root. If the installed version is newer, this copy is stale and may miss migrations: tell the user and re-sync it from the installed package's `skills/app-shell-upgrade/` directory before continuing.

## Migrations

[`references/migrations.md`](references/migrations.md) lists every change that requires editing the consuming app, newest first. Each entry says which apps it applies to, what breaks, how to detect it, and what to change. The package ships no CHANGELOG, so this file is the only migration record available locally.

## Procedure

1. **Find both versions.** The target is the version installed in the app. The starting version is the one the app used before the bump: read it from the git history of the app's `package.json` or lockfile. If you can't establish it, ask the user rather than guessing.
2. **Select the entries.** In `references/migrations.md`, take every entry whose version is above the starting version and at or below the target. A range entry such as `1.5.0 → 1.7.0` applies when it overlaps the upgrade. Starting below 1.0, include `Before 1.0`.
3. **Work oldest to newest.** A later entry can assume an earlier one has been applied.
4. **For each entry:** check its **Applies to** line against the app, run its detection step, and make its changes. If it doesn't apply, record why and move on.
5. **Update the lint plugin.** If the app uses `@tailor-platform/eslint-plugin-app-shell`, upgrade it alongside and run lint. Where an entry names a rule, that rule reports the affected code in JS and TS files.
6. **Verify.** Run the app's type-check, lint, tests and build. Then check the screens the entries touch in light and dark mode, because most of these changes compile and only show visually.
7. **Refresh copied skills.** If the app keeps copies of the app-shell skills (for example `.claude/skills/app-shell-patterns/` or `.claude/skills/app-shell-upgrade/`), replace them with the installed package's `skills/` directories so their guidance matches the new version.
8. **Report.** List each entry you applied, each one you skipped and why, and anything that still needs a visual check by a person.

## Rules

- A green build does not mean the upgrade is done. Work through every selected entry.
- When an entry says to replace a component, prop or token, write the replacement the way the `app-shell-patterns` skill describes it.
- Change only what the entries require. Leave refactors and new features for a separate change.
