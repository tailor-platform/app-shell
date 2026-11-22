## AppShell UI (`@tailor-platform/app-shell`)

The package at `{{PACKAGE_DIR}}/` builds its UI with AppShell. Whatever you know of AppShell's API, from training, earlier sessions or other projects, may not match the installed version. It also looks like shadcn/ui but differs, so don't fill gaps from that or other UI libraries. The docs for the installed version are in `{{DOCS_ROOT}}/`. Before you write or change UI code here, read the guide that indexes them:

@{{GUIDE_PATH}}

The path is relative to this file. It is gitignored, so open it by its exact path: search tools skip it. If it's missing, install dependencies first.

Build UI from AppShell components. Don't use raw HTML elements or another UI library where an AppShell component exists.

This block is managed by `{{SYNC_COMMAND}}`, which overwrites edits between its markers. Put project notes outside it.
