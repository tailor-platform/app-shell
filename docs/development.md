# Developing AppShell

## Local Development Environment

### Setup

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

Open `localhost:3000` to see the example app running.

## Publishing Updates to AppShell

AppShell uses changeset to manage releases and versioning.  To make a new version release:

1. Run `npx changeset` and follow the prompts (likely just selecting "@tailor-platform/app-shell" as the package to update)
2. Edit the new file created in `.changeset/` to add a description of your change.  Don't worry about this weird file, changeset will remove it when it makes its automatic PR.  The file's decription will be saved in the CHANGELOG.md and also added in the Github Release
3. Open a PR to `main` from your feature branch
4. Changeset will open a PR for your release – Review that PR; merging it will publish the new version to NPM
