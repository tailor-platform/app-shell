# Workflow

Modes share the same logic. Constants, queries, mutations, and templates live in
[reconcile.md](reconcile.md); the state classification lives in
[states.md](states.md); the issue-creation machinery is reused from
`pf-feedback-triage` ([issue-template.md](../../pf-feedback-triage/references/issue-template.md),
[project-routing.md](../../pf-feedback-triage/references/project-routing.md)).

## Preflight

1. `gh auth status` — confirm `project`, `repo`, `read:org`. If `project` is missing, ask the user to run `! gh auth refresh -s project --hostname github.com` and stop until confirmed.
2. **Resolve the active component(s)** from `--component <name>` / `--all` and load the file(s) under [components/](components/) (reconcile.md → Loading the active component). Determine whether the lifecycle (milestone+release) is enabled for each.
3. Re-discover the project id and Component/Module field + option ids for the component's `PROJECT` (reconcile.md query 4 / project-routing.md). Re-fetch repo label ids (query 7).
4. Note the operator account (`gh api user --jq .login`) — secondary corroboration only; idempotency keys on the comment template shape + ticket link (reconcile.md → State detection), not author login, so handoffs / scheduled-vs-manual runs still recognise prior reconciler comments.
5. Parse `--dry-run` → replace every mutation with an `echo "[DRY-RUN] …"`.
6. Resolve the digest recipient (reconcile.md → Slack digest): `--slack-user <id>` / `--slack-channel <id>` if passed, else the authenticated Slack user (self-DM), else print to output. Never hard-code a recipient.

## Full sweep (default / scheduled) — per component

### 1. Build the three indexes

- **Discussions** — run reconcile.md query 1 (in-scope, `LABEL`, with comments). Run query 2 and classify the fuzzy candidates against the component's Scope/Exclusions; confident hits become proposed `LABEL` labels, the rest go to _needs a human_.
- **Tickets** — run query 3; keep items matching the component's `PROJECT_COMPONENT` / module. Build the link map both ways: ticket→discussion by scanning the body for **any** discussion reference (`knowledge/discussions/(\d+)` — never a marker string; see reconcile.md → State detection → _Forward-linked?_), and discussion→ticket from references in discussion comments/body. Expect some legacy tickets to have neither (forward link genuinely missing).
- **Versions** — lifecycle only: run queries 5 and 6. Build `milestone version → shipped?` from the releases list, and the next unreleased version from the highest published release plus any pending `.changeset/*.md` in `RELEASE_REPO` (reconcile.md → Milestone reconciliation). Skip when the lifecycle is disabled.

### 2. Classify each in-scope discussion

For every in-scope discussion, walk [states.md](states.md): resolve its linkage state first, then milestone, then release (lifecycle only), then hygiene. Use the comment-based detection in reconcile.md — never assume; read the actual comments. When handling milestone state, don't trust the milestone title at face value — cross-check it against release notes + pending changesets (reconcile.md → Milestone reconciliation) to compute the true-shipped/next version and catch a stale milestone.

**Before proposing a new ticket, read the replies for disposition hints.** A maintainer reply often sets direction that means _no ticket should be filed_ — "that's by design", "use X instead", a workaround that's now the answer, "belongs in <other component>", or a request for more info the author hasn't answered. When a reply does this, route to `needs-info` / out-of-scope / wontfix and flag it; do not file. Only the absence of such a hint clears the way to propose a ticket. (Replies can also _reinforce_ filing.)

**Then, before actually proposing a new ticket, verify it isn't already addressed** (lifecycle only — reconcile.md → Already-addressed verification): grep the component's release-note bodies (query 6) and search the codebase (at the version matching the latest release, when a local checkout is available) for the feature's export/symbol/prop. If found shipped, don't file — propose the "already addressed in vX.Y.Z" + `status: resolved` comment instead (states.md → Release). Only file when both checks come back negative.

Record, per discussion, the single concrete action (or "in sync", or a flag).

### 3. Apply the auto actions

Apply only the internal bookkeeping, and record each for the digest:

- set `pf-triaged` where a discussion is linked but unlabelled;
- backfill `Source discussion:` on tickets that lack it.

Do nothing customer-facing here.

### 4. Assemble the queue and DM the digest

Group results into _applied automatically_, _awaiting approval_, and _needs a human_, then DM it to the recipient resolved in preflight (reconcile.md → Slack digest: `--slack-user`/`--slack-channel` if passed, else the authenticated Slack user). If Slack is unavailable, print the digest in the response.

**Stop here for the scheduled/unattended case** — nothing customer-facing has posted.

### 5. Apply approved items (interactive)

When the operator reviews and approves (whole queue, or a subset like "1, 3 and 4"):

- post comments (reconcile.md → mutations), using the templates, parsing/linking the right ticket and version;
- create tickets where approved — build via [issue-template.md](../../pf-feedback-triage/references/issue-template.md), route via [project-routing.md](../../pf-feedback-triage/references/project-routing.md) (project + Component/Module + Level), forward-link in the body — then post the link comment;
- apply approved `LABEL` / `status:` label changes;
- apply approved milestone writes (create/correct/re-target — reconcile.md → Milestone reconciliation), when the digest flagged one as stale against release notes or pending changesets.

Re-check the discussion's comments immediately before each post, in case state changed since the digest. **Re-resolve every node id by `number` in this step** — never reuse or hand-write one — and **assert each mutation's returned URL points at the intended discussion/issue** before reporting it as done (reconcile.md → Resolving node IDs). An id that is wrong but well-formed silently posts to an unrelated repo. This applies especially to items the operator adds _during_ approval, which were never in the resolved batch.

Report back what posted, with links. Still never cut a release. Leave every flag-only item untouched.

## All components (`--all`)

Run the full sweep for each configured component (every `components/*.md` except `_template.md`) in turn, sharing one preflight. Emit one digest section per component. Apply-approved is still interactive and per-section.

## Single discussion

Given one discussion URL: run preflight, resolve the component from `--component` or infer it from the discussion's `LABEL` / `TITLE_PREFIX`, build only the slices needed for that discussion and its linked ticket(s), classify it through [states.md](states.md), then present the proposed action(s) inline and apply on approval. Same gates apply.

## Guardrails

- Re-derive state every run; never rely on a previous run's memory.
- Read a discussion's comments before proposing a comment — comment presence is the truth for "already done".
- **Resolve identifiers, never infer them.** Node ids by `number`; forward links by discussion reference, not marker text; ticket links from the query's own `url` field. Two production misfires came from inferring an identifier that looked right (reconcile.md → _Forward-linked?_ and → Resolving node IDs). Verify every mutation's returned URL before calling it done.
- Approval is required for everything a customer sees (comments, tickets, `LABEL`/`status:` labels) plus milestone writes; only `pf-triaged` and forward-link backfill are auto.
- Flag-only states (de-scope, wontfix, regression, version-ambiguous, low-confidence, duplicates, multi-candidate) are listed, never acted on.
- The skill never assigns a milestone automatically, and never creates a release or closes a discussion; it may **propose** a milestone create/correct/re-target for approval, cross-checked against release notes + pending changesets (reconcile.md → Milestone reconciliation).
- When a component's lifecycle is disabled (milestone/release fields empty), never guess a milestone or release — report the dimension as _not configured_.

## Scheduling

This skill is built to run unattended through step 4 (detect + auto-bookkeep + digest), then have a human approve step 5. To schedule the detect+digest pass, use the `schedule` skill / a cron routine that invokes this skill in sweep mode for a given `--component` (or `--all`), passing `--slack-user <id>` (or `--slack-channel <id>`) so the digest reaches the right place — the recipient lives in the routine definition, not in the skill. (Omit it and the digest self-DMs the authenticated Slack user.) Keep step 5 interactive so no customer-facing comment posts without approval.
