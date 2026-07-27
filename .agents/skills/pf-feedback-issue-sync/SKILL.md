---
name: pf-feedback-issue-sync
description: "Generic, component-driven reconciler that keeps Tailor Platform community feedback in sync across three systems — Discussions in tailor-professional-service/knowledge, tickets in tailor-inc/platform-planning (projects 15/17), and package releases — for one component at a time (app-shell, sdk, erp-kit, …), selected with --component. Stateless: every run re-derives each discussion's state from the live sources. Auto-applies safe internal bookkeeping, queues every customer-facing action for approval, and DMs a digest. Use when: running a scheduled feedback sweep for a component, reconciling discussions with their board tickets, linking a discussion to a ticket, filing a ticket from a discussion, earmarking a discussion once its ticket gets a release milestone, announcing a discussion once a release ships, or processing a single discussion. Trigger on: 'feedback sweep', 'reconcile <component> discussions', 'feedback issue sync', 'feedback issue reconcile', 'catch up <component> feedback'."
argument-hint: "(--component <name> | --all) [--slack-user <id> | --slack-channel <id>] [--dry-run] [<discussion-url>]"
metadata:
  author: tailor-internal
  scope: team-pf
---

# Platform feedback ⇄ issue sync

## What this is

A **stateless, component-driven reconciler** that keeps Tailor Platform community
feedback in sync between three systems, for **one component at a time**:

- **Discussions** — `tailor-professional-service/knowledge` (the "Platform Feedback" category).
- **Tickets** — real issues in `tailor-inc/platform-planning`, tracked on project **15** (Tailor Platform) or **17** (ERP Kit Modules) with the component's routing field.
- **Releases** — package releases (e.g. `@tailor-platform/app-shell@X.Y.Z`) on the component's release repo.

The component is chosen with `--component <name>` (or `--all` to sweep every
configured component in turn). Each component is defined by one file under
[references/components/](references/components/) — see [the component model](#component-model) below.

Humans own **cutting the release**, full stop — this skill never does that. A
release **milestone** on a ticket (`<milestone_prefix>X.Y.Z`, e.g. `AppShell
v1.4.0`) is normally set by a human too, but the skill may **propose** creating
or correcting one for approval when it catches one drifting out of sync with
release notes — it never assigns a milestone automatically. Mostly, it
_observes_ the current state of those systems and _communicates_ the
consequences back onto the discussions — proposing comments, labels, tickets,
and (now) milestone corrections for a human to approve.

## How it relates to the sibling feedback skills

This skill is the **ongoing reconciler** that sits between, and reuses, the two
one-shot feedback skills:

| Skill                               | Direction | What it does                                                                                                          |
| ----------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| `team-ps/platform-feedback`         | report    | detects signals and **files / upvotes a Discussion**                                                                  |
| `team-pf/pf-feedback-triage`        | triage    | reads untriaged Discussions and **files routed Issues** (one batch pass)                                              |
| **`pf-feedback-issue-sync`** (this) | reconcile | keeps **discussion ⇄ ticket ⇄ release** in sync continuously — link upkeep, milestone earmarks, release announcements |

To avoid duplicating the issue-creation machinery, this skill **reuses
`pf-feedback-triage`'s references** for the "file a ticket" step:

- [../pf-feedback-triage/references/issue-template.md](../pf-feedback-triage/references/issue-template.md) — issue title/body.
- [../pf-feedback-triage/references/project-routing.md](../pf-feedback-triage/references/project-routing.md) — add to project 15/17, set Component/Module, Level.
- [../pf-feedback-triage/references/discussion-fetch.md](../pf-feedback-triage/references/discussion-fetch.md) — the Discussions GraphQL fetch/parse pattern (this skill applies its own scoping — see [reconcile.md](references/reconcile.md)).

The component identity (label, project, project_component, package) is the same
data `platform-feedback`/`pf-feedback-triage` use; this skill's per-component
files add only the **sync-specific** fields (milestone naming, release source,
scope classification) on top.

## Component model

One file per component under [references/components/](references/components/).
The frontmatter carries the component's identity plus the sync lifecycle config;
the body carries scope/search/exclusion rules and component-specific notes. The
schema and a worked example live in
[references/components/\_template.md](references/components/_template.md).

Configured components:

- [app-shell](references/components/app-shell.md) — fully configured.
- [sdk](references/components/sdk.md), [erp-kit](references/components/erp-kit.md) — identity configured; **milestone/release coordinates pending confirmation** (link + triage reconcile only until filled).

**Lifecycle opt-in.** A component runs the milestone-earmark and release-announce
stages only when its file defines `milestone_prefix` + `release_repo` +
`release_tag_prefix`. When those are empty, the component still gets the
linkage/triage reconcile (link comments, ticket filing, `pf-triaged`, status
labels) and the milestone/release stages are reported as _not configured_ rather
than acted on. Adding a component is a drop-in: copy `_template.md`, fill it,
no SKILL.md change.

## Mental model — read this first

Ticket turnaround is long, so there is **no end-to-end flow** that walks one
discussion from report to release in a single pass. Instead, **every run starts
with a blank memory and re-derives each discussion's state from scratch** from
the live sources. There is no local state file and no hidden marker — the GitHub
comments, labels, milestones, and releases _are_ the state. This makes the sweep
self-healing: manual edits, comments from teammates, and deleted comments all
just get re-derived correctly on the next run.

The four sources of truth (per the active component's config):

| Signal                                                                                        | Source                     | Means                          |
| --------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------ |
| component `label` on a discussion                                                             | knowledge repo             | in scope                       |
| link comment referencing a ticket                                                             | discussion comments / body | linked (+ `pf-triaged`)        |
| `<milestone_prefix>X.Y.Z` milestone (e.g. `AppShell v1.4.0`) on the ticket                    | platform-planning          | earmarked for that version     |
| release `<release_tag_prefix>X.Y.Z` published (milestone closure = weaker corroboration only) | component's release repo   | shipped (+ `status: resolved`) |

## Modes

- **Full sweep** (default, and what runs on a schedule): for the chosen component, reconcile every in-scope discussion, auto-apply the safe bookkeeping actions, queue everything customer-facing for approval, and DM a digest.
- **All components**: `--all` runs the full sweep for each configured component in turn, one digest section per component.
- **Single discussion**: pass a discussion URL to scope the same logic to one discussion (component is inferred from its label/title prefix, or taken from `--component`).

## How a run goes

1. Resolve the active component(s) from `--component` / `--all` and load the component file(s). See [reconcile.md](references/reconcile.md).
2. Build the three indexes (discussions+comments, board tickets+milestones, releases). See [reconcile.md](references/reconcile.md).
3. For each in-scope discussion, derive its state and the needed action using the matrix in [states.md](references/states.md). Before proposing a brand-new ticket, verify the request isn't already shipped — grep the component's release notes and search its codebase (reconcile.md → Already-addressed verification) — and reconcile any linked ticket's milestone against release notes + pending changesets (reconcile.md → Milestone reconciliation).
4. **Auto-apply** the safe internal actions (`pf-triaged` label, forward-link backfill on the ticket body).
5. **Queue** every customer-facing action (discussion comments, new issues, label/`status:` changes) as a proposal — apply nothing yet.
6. **DM the digest** to the resolved recipient (see [reconcile.md → Slack digest](references/reconcile.md): `--slack-user`/`--slack-channel` if passed, else the authenticated Slack user, else printed to output — nothing hard-coded). It is **action-oriented** — _applied automatically_ (audit), _awaiting your approval_, and _needs a human_. In-sync discussions are collapsed to a count, never listed individually.
7. On approval (interactive), apply the approved items. Flag-only states are never applied — just listed.

Step-by-step procedure: [workflow.md](references/workflow.md).

## Authorization policy

- **Auto (no approval, but reported):** `pf-triaged` label, forward-link backfill in the ticket body. Internal bookkeeping only.
- **Approval required:** any discussion comment (link / earmark / release / already-addressed), creating a ticket, applying the component `label`, changing a `status:` label, creating or correcting a ticket's milestone. Anything a customer can see, plus milestone writes (previously human-only).
- **Flag-only (never auto-acted):** milestone removed after an earmark (de-scope), wontfix, regression/reopen, an open ticket milestoned to an already-published version with no evidence of merged-but-unreleased work, and any case where the shipped version can't be named confidently. Listed for a human; the skill takes no action.

## Prerequisites

- `gh auth status` must include the `project`, `repo`, and `read:org` scopes. If `project` is missing, ask the user to run `! gh auth refresh -s project --hostname github.com` and wait for confirmation.
- The digest recipient is resolved at run time — **no hard-coded user**: `--slack-user <id>` / `--slack-channel <id>` if passed (this is how a scheduled routine sets it), else the authenticated Slack user (self-DM). The Slack MCP must be connected for the DM; if it isn't (e.g. a headless run), still produce the digest as text in the response.
- Never assigns a milestone automatically, cuts a release, or closes a discussion — those are human-owned; it may propose milestone creates/corrections for approval (see Authorization policy).
