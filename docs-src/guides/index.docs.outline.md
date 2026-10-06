---
kind: prose
group: index
title: Documentation Index
description: Reading routes, implementation rules, and a complete catalogue of AppShell guides, pages, patterns, components, and APIs
---

# Documentation Index

These docs describe the version of `@tailor-platform/app-shell` they ship with.
Use them as the source of truth for API names, props, imports, and migrations.
All links below are relative to this file.

## Where to start

| Task                                                                     | Reading route                                                                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Install or set up AppShell                                               | [Quickstart](quickstart.md), then [Styling and Theming](concepts/styling-theming.md)                      |
| Build a whole screen                                                     | Choose a page below, then the patterns it references, then the component and hook APIs                    |
| Build a list, detail section, form, or interaction                       | Choose a pattern below, then its component and hook APIs                                                  |
| Configure authentication or routing                                      | The relevant concepts below, then the matching API references                                             |
| Choose components or fix styling                                         | [Styling and Theming](concepts/styling-theming.md), then the exact component API                          |
| Build a missing component                                                | [Custom Components](concepts/custom-components.md) and [Styling and Theming](concepts/styling-theming.md) |
| Work with GraphQL data                                                   | [GraphQL](concepts/graphql.md), then the relevant list/detail patterns and collection APIs                |
| Upgrade, or diagnose styling/theming/dark-mode breakage after an upgrade | [Migrations](migrations.md), even if the build succeeds                                                   |

## Implementation rules

1. **Choose the screen before its parts.** For a whole screen, match a page first;
   its layout and composition determine which patterns to use. For a single
   part or recipe, go directly to a pattern. If nothing matches, compose from
   the concept guidance and component docs.
2. **One part, one recipe.** Do not mix patterns that solve the same problem in
   one component. Composing patterns for different parts of a screen is expected.
   Cite the implemented pattern's slug at the top of the file, for example
   `/* pattern: list/dense-scan */`, even when a page directed you to it.
3. **Use AppShell components and documented imports.** Do not replace a matching
   AppShell component with raw HTML or another UI library. Read its exact API
   and the pattern's examples; do not guess imports, props, or design tokens.
4. **Read the cross-cutting guidance before building UI.**
   [Styling and Theming](concepts/styling-theming.md#composition--emphasis-rules)
   defines the emphasis, status, action-placement, and loading/empty/error rules.
   Read [Custom Components](concepts/custom-components.md) when filling a gap,
   and [GraphQL](concepts/graphql.md) when fetching data.
5. **Forms default to a modal.** Use a routed full-page form only when the design
   explicitly calls for it. Use AppShell [Form](components/form.md) and
   [Field](components/form.md), submitting via `onFormSubmit` rather than a bare
   `<form onSubmit>` with `FormData`. Wrap each control, including dropdowns, in
   `Field.Root name="…"` for registration. React Hook Form is optional and
   consumer-installed; add it only for cross-field validation, field arrays,
   or a Zod resolver. See the form patterns below for complete examples.

## Documentation catalogue

The following catalogue is generated from the documentation outlines. Read
only the entries relevant to the task, rather than loading the entire tree.

<!-- docs-index -->
