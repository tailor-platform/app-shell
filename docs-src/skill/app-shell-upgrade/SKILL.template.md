---
name: app-shell-upgrade
description: "Upgrades @tailor-platform/app-shell in a consuming app and updates the app's code for the new version. Use when: asked to bump, update or upgrade @tailor-platform/app-shell; when the version has already been bumped (in package.json, a lockfile, or a Renovate or Dependabot PR) and the app's code needs updating, migrating or fixing to match; when reviewing an app-shell version change; or when diagnosing styling, theming, colour, dark-mode, test or type breakage that appeared after one. These breakages are often silent, with a green build and no warning. Lists every change that requires editing the app, with how to detect and fix each. For building or editing screens, use app-shell-patterns."
compatibility: "Requires @tailor-platform/app-shell in the project. Use the copy shipped in the installed package's skills/ directory, so its migration list covers the installed version."
metadata:
  app-shell-version: "{{APP_SHELL_VERSION}}"
---

# App-Shell Upgrade

## Purpose

Move an app from one `@tailor-platform/app-shell` version to another and apply every migration in between, whether the version bump is still to do or has already landed.

## Version

This skill was generated from `@tailor-platform/app-shell` **{{APP_SHELL_VERSION}}** and lists migrations up to that version. Resolve `@tailor-platform/app-shell/package.json` from the app you're working on, not a monorepo root. If the installed version is newer, this copy is stale and may miss migrations. Step 2 of the procedure checks this after the new version is installed.

## Migrations

[`references/migrations.md`](references/migrations.md) lists every change that requires editing the consuming app, newest first. Each entry says which apps it applies to, what breaks, how to detect it, and what to change. The package ships no CHANGELOG, so this file is the only migration record available locally.

## Procedure

1. **Get the new version installed.** If the app's `package.json` doesn't yet ask for the target version, bump `@tailor-platform/app-shell` to it, along with `@tailor-platform/eslint-plugin-app-shell` if the app uses it. If it already does (the user bumped it, or this is a Renovate or Dependabot PR), check that the installed package matches. Either way, run the app's install so the new version is in `node_modules`.
2. **Re-read this skill from the new version.** This copy may predate the bump, so its migration list can miss the very entries you need. Compare the installed version with the one in the Version section above. If the installed one is newer, read `skills/app-shell-upgrade/SKILL.md` and its `references/migrations.md` from the installed package and continue from that copy instead. If the app keeps copies of the app-shell skills (for example `.claude/skills/app-shell-patterns/` or `.claude/skills/app-shell-upgrade/`), replace them with the installed package's `skills/` directories now.
3. **Find the starting version.** It's the version the app used before the bump: read it from the git history of the app's `package.json` or lockfile, or from the PR's base branch. If you can't establish it, ask the user rather than guessing.
4. **Select the entries.** In `references/migrations.md`, take every entry whose version is above the starting version and at or below the installed version. A range entry such as `1.5.0 → 1.7.0` applies when it overlaps the upgrade. Starting below 1.0, include `Before 1.0`.
5. **Work oldest to newest.** A later entry can assume an earlier one has been applied.
6. **For each entry:** check its **Applies to** line against the app, run its detection step, and make its changes. If it doesn't apply, record why and move on.
7. **Verify.** Run the app's type-check, lint, tests and build. Where an entry names a lint rule, that rule reports the affected code in JS and TS files. Then check the screens the entries touch in light and dark mode, because most of these changes compile and only show visually.
8. **Report.** List each entry you applied, each one you skipped and why, and anything that still needs a visual check by a person.

## Rules

- A green build does not mean the upgrade is done. Work through every selected entry.
- When an entry says to replace a component, prop or token, write the replacement the way the `app-shell-patterns` skill describes it.
- Change only what the entries require. Leave refactors and new features for a separate change.
