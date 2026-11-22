# AppShell docs (`@tailor-platform/app-shell` {{APP_SHELL_VERSION}})

These are the docs for the installed version of AppShell. Read the matching doc before you write or change a screen, form, table, dialog, navigation or styling, even if you've used AppShell before: other projects and older docs may be on a different version. Don't guess the API from shadcn/ui or Radix either: those guesses look right and are wrong here (`asChild` is `render`, `<form onSubmit>` is `Form onFormSubmit`, and `useToast()` returns the toast function itself).

Each entry below is a file at `<category>/<slug>.md` in this folder (the docs root that the AppShell block in `AGENTS.md` names).

**Pages** (`pages/`). Start here for a whole screen. A page fixes the layout and names the pattern for each part.

{{PAGES_TEASERS}}

**Patterns** (`patterns/`). One recipe for one part of a screen.

{{PATTERNS_TEASERS}}

**Components** (`components/`): {{COMPONENTS_SLUGS}}

**Hooks and functions** (`api/`): {{API_SLUGS}}

**Concepts** (`concepts/`): {{CONCEPTS_SLUGS}}

## Rules

- Build UI from AppShell components. Don't use raw HTML elements or another UI library where an AppShell component exists.
- Match a whole screen to a page doc first, then each part to one pattern. Don't mix two patterns that solve the same problem.
- One primary (filled) `Button` per view. Everything else is `outline`, `secondary` or `ghost`.
- An action lives in one place: the primary action and status in `Layout.Header`, workflow actions in `ActionPanel`, back and navigation in the breadcrumb.
- Creating or editing a document is a routed full-page form (`form-single-page`, `form-sectioned` or `form-wizard`). `form-modal` is for small entities with a handful of fields.
- Forms use `Form` and `Field` and submit through `onFormSubmit`, never a bare `<form onSubmit>`. See `components/form`, and "Form state" in `patterns/form-modal` for the rules every form pattern shares.
- Status and feedback colour comes from a component variant (`Badge`, `Alert`) or a semantic colour role. See `concepts/styling-theming`.
- Every data view handles loading, empty and error states.
- Read `patterns/i18n-labels` before writing screen text. UI strings go through the app's label catalog.
