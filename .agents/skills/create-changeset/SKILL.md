---
name: create-changeset
description: "Creates a changeset for version management. Use when: finishing a feature, preparing a release, after making changes that affect end-users, running npx changeset, creating a changelog entry."
---

# Create Changeset

Create a changeset file for the current branch's changes using the changesets versioning system. This project publishes `@tailor-platform/app-shell` to NPM via changesets.

## When to Create Changesets

**DO create changesets for changes that affect end-users:**

- New features (new components, hooks, utilities)
- Bug fixes that change behavior
- API changes (new props, changed function signatures)
- Breaking changes
- Performance improvements
- Documentation that affects API usage

**DO NOT create changesets for:**

- Internal refactoring that doesn't change behavior
- Removing unused dependencies
- Build/dev tooling changes
- Test-only changes
- Code style/formatting changes
- Internal type changes that don't affect public API

**Note:** Internal refactoring that changes user-facing dependencies (e.g., migrating from Radix UI to Base UI) should still get a **patch** changeset, even if the public API is unchanged. Users may be affected by transitive dependency changes.

## Procedure

### Step 1: Review Changes

Review all changes in the current branch to understand what was modified:

```
git diff main --stat
```

If you need more detail on specific files, inspect them individually.

### Step 2: Determine Bump Type

Based on the changes, determine the semver bump type:

- **patch**: Bug fixes, minor improvements, non-breaking changes
- **minor**: New features, new components, new hooks, new utilities (backward-compatible)
- **major**: Breaking changes (removed/renamed exports, changed behavior, API incompatibilities)

### Step 3: Write the Changeset File

Create a new markdown file under `.changeset/` with a random kebab-case name (e.g., `.changeset/cool-dogs-fly.md`).

The file format is:

```markdown
---
"@tailor-platform/app-shell": <bump-type>
---

<summary>
```

#### Summary Guidelines

- Write 2-3 lines describing the change from an end-user perspective
- For API-level changes, include minimal code examples showing how to use the new API
- For breaking changes, provide before/after migration examples
- Include usage examples for new components, hooks, or utilities

#### Example — Minor (new feature):

````markdown
---
"@tailor-platform/app-shell": minor
---

Add `DescriptionCard` component for displaying structured field data in a responsive grid layout.

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";

<DescriptionCard
  fields={[
    { label: "Name", value: "Alice" },
    { label: "Email", value: "alice@example.com" },
  ]}
/>;
```
````

#### Example — Patch (bug fix):

```markdown
---
"@tailor-platform/app-shell": patch
---

Fix sidebar not collapsing properly on mobile viewports when navigating between pages.
```

#### Example — Major (breaking change):

````markdown
---
"@tailor-platform/app-shell": major
---

Replace `defaultResourceRedirectPath` with `redirectToResource()` helper for module-level redirects.

Before:

```tsx
defineModule({ defaultResourceRedirectPath: "/dashboard" });
```

After:

```tsx
import { redirectToResource } from "@tailor-platform/app-shell";
defineModule({ redirect: redirectToResource("dashboard") });
```
````
