# Reconcile — constants, queries, detection, templates

All commands assume the `gh` CLI with `project`, `repo`, `read:org` scopes.
Use `-F` (not `-f`) for GraphQL variables so newlines / special characters pass
through safely. User-controlled text (titles, bodies, keywords) always passes via
`-F` / stdin — never spliced into a query string.

The values in **`UPPER_CASE`** below come from the **active component file**
(`references/components/<component>.md`): `LABEL`, `TITLE_PREFIX`, `PROJECT`,
`PROJECT_COMPONENT`, `PRIMARY_PACKAGE`, `MILESTONE_PREFIX`, `RELEASE_REPO`,
`RELEASE_TAG_PREFIX`.

## Fixed constants (component-independent)

| Thing                | Value                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Discussions repo     | `tailor-professional-service/knowledge`                                                               |
| Feedback category    | `Platform Feedback` (others: `Ideas`, `Q&A`, `General`, `Announcements`)                              |
| Feedback category id | `DIC_kwDOQUG6j84C4k5F`                                                                                |
| Triaged label        | `pf-triaged`                                                                                          |
| Status labels        | `status: in-progress`, `status: needs-info`, `status: pending`, `status: resolved`, `status: wontfix` |
| Tickets repo         | `tailor-inc/platform-planning`                                                                        |
| Board (project 15)   | org `tailor-inc`, project `15` (`PVT_kwDOArGW6M4BCOub`)                                               |
| Board (project 17)   | org `tailor-inc`, project `17` (`PVT_kwDOArGW6M4BZjXw`)                                               |
| Digest recipient     | resolved at run time — see [Slack digest](#slack-digest) (never hard-coded)                           |

> Project/field/option ids are re-discovered at run start (query 4) and via
> [../../pf-feedback-triage/references/project-routing.md](../../pf-feedback-triage/references/project-routing.md);
> prefer the discovered values — they change if a field is recreated.

## Loading the active component

- `--component <name>` → load `references/components/<name>.md`. `--all` → load
  every `references/components/*.md` except `_template.md` and sweep each in turn.
- Parse the frontmatter into the `UPPER_CASE` values above.
- **Lifecycle enabled** iff `MILESTONE_PREFIX` _and_ `RELEASE_REPO` _and_
  `RELEASE_TAG_PREFIX` are all non-empty. When not enabled, skip the milestone
  and release queries/states and report that dimension as _not configured_.
- Note the operator account (`gh api user --jq .login`) — a **secondary**
  corroboration only. Idempotency keys on the comment **template shape + ticket
  link** (see State detection), not author login, so past reconciler comments are
  recognised even when a prior run used a different account.

## Scope & classify

A discussion is **in scope** if it carries the component's `LABEL`. That is the
canonical set; reconcile actions only ever run against it. **Exception:** some
components share a label with siblings (e.g., `erp-kit` and `erp-kit-module` both
use the `erp-kit` label). For those, the component file's Scope section defines
an additional gate (e.g., title prefix `[erp-kit]` for erp-kit itself). Apply
that gate after the label check — an implementation should read the component
file's Scope section before building the in-scope set.

Separately, run a **fuzzy candidate pass** (component file → Scope) to catch
feedback nobody has labelled yet, then apply the component's **Exclusions** to
decide: confident it's about the component itself → propose the `LABEL`
(approval); "merely uses it" or low confidence → list under _needs a human_,
never label/file. Catch-all components with an empty `LABEL` have no canonical
in-scope set — they are handled keyword-only and never auto-labelled.

## Read queries

### 1. In-scope discussions + comments (the set that needs reconciling)

```bash
# LABEL from the active component, e.g. AppShell
gh api graphql --paginate -f query='
query($q:String!,$endCursor:String){
  search(query:$q, type:DISCUSSION, first:50, after:$endCursor){
    pageInfo{ hasNextPage endCursor }
    nodes{ ... on Discussion {
      id number title url updatedAt locked isAnswered
      category{ name }
      author{ login }
      bodyText
      labels(first:20){ nodes{ name } }
      comments(last:100){ nodes{ author{ login } bodyText url createdAt } }
    } }
  }
}' -F q="repo:tailor-professional-service/knowledge is:open $([ -n \"$LABEL\" ] && echo \"label:\\\"$LABEL\\\"\" || echo '')"
```

**If LABEL is empty** (catch-all components), skip this query — there is no canonical
in-scope set, and the search would be invalid. Proceed directly to the fuzzy
candidate pass (query 2) instead.

Use `last` (not `first`) so state detection sees the newest operator/maintainer replies (and older reconciler comments for idempotency) on long threads. `last:100` covers up to 100 comments per discussion; if a discussion has >100 comments, the oldest comments are missed (but reconciler comments are usually recent, so this is acceptable — the skill is stateless and re-detects on every run). The
`bodyText` carries the structured form (`Feedback Type`, `Related Component`,
`Environment` version table, etc.). The fetch/parse pattern mirrors
[../../pf-feedback-triage/references/discussion-fetch.md](../../pf-feedback-triage/references/discussion-fetch.md);
the scoping differs — this skill wants **all** in-scope discussions (including
already-triaged ones, which still need milestone/release reconciliation), not
just untriaged.

### 2. Fuzzy candidate pass (untagged posts to classify)

```bash
# SEED = a fuzzy term from the component file, e.g. app-shell
gh api graphql --paginate -f query='
query($q:String!,$endCursor:String){
  search(query:$q, type:DISCUSSION, first:50, after:$endCursor){
    pageInfo{ hasNextPage endCursor }
    nodes{ ... on Discussion {
      number title url bodyText
      labels(first:20){ nodes{ name } }
    } }
  }
}' -F q="repo:tailor-professional-service/knowledge is:open $SEED"
```

Then filter in code per the component's Scope/Exclusions: title/body matches a
fuzzy term, AND labels do not include `LABEL`, AND not labelled for another
component.

### 3. Board tickets for this component (id, state, milestone, body)

```bash
# PROJECT (15 or 17) from the component. For project 15 filter on Component;
# for project 17 filter on Module (== component's captured module).
gh api graphql --paginate -f query='
query($org:String!,$num:Int!,$endCursor:String){
  organization(login:$org){ projectV2(number:$num){
    items(first:100, after:$endCursor){
      pageInfo{ hasNextPage endCursor }
      nodes{
        id type
        component: fieldValueByName(name:"Component"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
        module:    fieldValueByName(name:"Module"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
        content{
          ... on Issue { number url state stateReason title bodyText
            milestone{ title state }
            labels(first:20){ nodes{ name } }
            repository{ nameWithOwner } }
        }
      }
    }
  } }
}' -F org=tailor-inc -F num="$PROJECT"
```

Keep only **real Issues** from `tailor-inc/platform-planning` (filter by
`repository.nameWithOwner == "tailor-inc/platform-planning"`); ignore cross-repo
issues or items without `number` (which would be DraftIssues, which can't have
milestones, labels, or participate in linking). Among those, keep nodes whose
`Component` (project 15) or `Module` (project 17) matches the active component's
`PROJECT_COMPONENT` / module. The `milestone.title` (`MILESTONE_PREFIX X.Y.Z`)
is the earmark signal; `milestone.state` / a published release is the shipped
signal. Note `bodyText` is **plain-text-normalised**: markdown is stripped and
issue/discussion URLs are rewritten to `owner/repo#N` short refs. Parse it with
that in mind (see State detection → _Forward-linked?_), or re-fetch the raw
`.body` over REST when the literal markdown matters. `stateReason` + `labels` let duplicate (`DUPLICATE`) and wontfix
(`NOT_PLANNED` / `wontfix` label) be detected straight
from this payload, without extra per-issue fetches.

### 4. Project + field ids (re-discover at run start)

```bash
gh api graphql -f query='
query($org:String!,$num:Int!){ organization(login:$org){ projectV2(number:$num){
  id
  fields(first:50){ nodes{ ... on ProjectV2SingleSelectField { id name options{ id name } } } }
} } }' -F org=tailor-inc -F num="$PROJECT"
```

Routing mutations (add to project, set Component/Module, Level) are in
[../../pf-feedback-triage/references/project-routing.md](../../pf-feedback-triage/references/project-routing.md).

### 5. Milestones (upcoming + shipped versions) — lifecycle only

```bash
# MILESTONE_PREFIX from the component, e.g. "AppShell v"
gh api --paginate 'repos/tailor-inc/platform-planning/milestones?state=all&per_page=100' \
  | jq -s --arg p "$MILESTONE_PREFIX" \
    'add | .[] | select(.title|startswith($p)) | {title, state, due_on, closed_at}'
```

### 6. Releases (what has actually shipped) — lifecycle only

```bash
# RELEASE_REPO + RELEASE_TAG_PREFIX from the component.
# Paginate — some repos (e.g. app-shell) have >50 releases, so a single page can
# miss older shipped versions and wrongly conclude a milestoned version hasn't shipped.
gh api --paginate "repos/$RELEASE_REPO/releases?per_page=100" \
  | jq -s --arg t "$RELEASE_TAG_PREFIX" \
    'add | .[] | select(.tag_name|startswith($t) and .draft==false) | {tag:.tag_name, published:.published_at}'
```

A milestone `<milestone_prefix>X.Y.Z` is shipped when a **published** (non-draft)
release tagged `<release_tag_prefix>X.Y.Z` exists (a closed milestone is a
corroborating, weaker signal). Drafts are excluded so premature announcements
don't happen before a release is published.

### 7. Repo label ids (needed to add/remove discussion labels)

```bash
gh api graphql -f query='
query{ repository(owner:"tailor-professional-service",name:"knowledge"){
  labels(first:60){ nodes{ id name } } } }'
```

### 8. Resolve the canonical for a duplicate ticket

```bash
gh api graphql -f query='
query($n:Int!){ repository(owner:"tailor-inc",name:"platform-planning"){
  issue(number:$n){ number state stateReason
    timelineItems(first:80, itemTypes:[MARKED_AS_DUPLICATE_EVENT]){
      nodes{ ... on MarkedAsDuplicateEvent { canonical{ ... on Issue { number url title state milestone{ title state } } } } } }
  }
}}' -F n=$NUM
```

If the timeline has no `MarkedAsDuplicateEvent`, fall back to parsing
`duplicate of #N` / a `#N` reference from the ticket's comments (requires an
additional fetch: `gh api repos/tailor-inc/platform-planning/issues/$NUM/comments`)
or body; if still unresolved, flag for a human.

## Already-addressed verification (before filing a new ticket) — lifecycle only

Before proposing a brand-new ticket for an in-scope discussion, confirm the
request isn't already shipped. Check **both**:

1. **Release notes** — reuse query 6's release list; `gh api` already returns
   each release's `body`, so grep the bodies (not just tags) for the feature:
   `... | jq -s --arg t "$RELEASE_TAG_PREFIX" 'add | .[] | select(.tag_name|startswith($t)) | {tag:.tag_name, body}'`
   then search `body` for the feature's keywords/symbol name.
2. **Codebase** — search the component's source for the relevant export /
   symbol / prop (an exported component, a prop on a component, a union
   member, a hook) that the request is asking for. Use the local checkout **at
   the version matching the latest release** when available (`git checkout
<release_tag_prefix>X.Y.Z` in a scratch clone, or `gh api` the tree at that
   tag) so "shipped" and "checked" agree; if no local checkout is available,
   fall back to release notes alone.

If either check confirms the feature is shipped, do **not** file a new
ticket — treat it as "New discussion matches an already-shipped ticket"
(states.md → Release): propose the combined link + "already addressed in
vX.Y.Z" comment (approval-gated), naming the version found in step 1, plus
`status: resolved`. Only when both checks come back negative does the normal
new-ticket proposal apply.

## Milestone reconciliation against release notes + changesets — lifecycle only

When reconciling a linked ticket's milestone, cross-check the milestone title
against what actually shipped, rather than trusting it at face value:

- **True shipped version** — match the ticket's feature to a release-note
  entry (query 6's `body`, per above) to find which `<release_tag_prefix>X.Y.Z`
  it actually landed in.
- **Next unreleased version** — the highest published release (query 6) plus
  any pending changesets in `RELEASE_REPO` (files under `.changeset/*.md`;
  a `minor`/`patch` bump in an unreleased changeset means that's the next
  version once cut).
- **Closed ticket, milestone names the wrong version** → stale; propose
  correcting it to the true shipped version. The shipped version may not have
  a milestone yet (release milestones can lag the release itself) — propose
  creating it. A shipped-version milestone may still show `state: open`; that
  alone isn't disqualifying.
- **Open ticket, milestone names an already-published version** → impossible
  (the feature can't have shipped in a release that's already out); if the
  work is merged-but-unreleased (present in the codebase, or has a pending
  changeset), propose re-targeting to the next unreleased version; if
  genuinely unimplemented, release notes can't name a version — flag for a
  human (clear vs. re-target is a human call).
- The skill still never **cuts a release**. Creating/updating a milestone is
  now an approval-gated proposal (previously human-only) — see the mutation
  below.

## State detection without stored state

- **Linked?** A comment **or the discussion body / form** references the ticket
  (`tailor-inc/platform-planning#NNNN` or its URL). Presence = linked. Scan both
  — in practice the tracking link usually lives in the discussion body.
- **Forward-linked?** (ticket → discussion) The ticket body contains **any**
  reference to a knowledge discussion. Match on the discussion **number**, and
  match **both surface forms**:

  ```
  knowledge/discussions/([0-9]+)|tailor-professional-service/knowledge#([0-9]+)
  ```

  Two traps, both of which silently produce false "missing forward link" on
  _every_ ticket the sibling triage skill has ever filed:
  1. **Don't key on a marker string.** `pf-feedback-triage` writes
     `**Source:** <url>` (see
     [../../pf-feedback-triage/references/issue-template.md](../../pf-feedback-triage/references/issue-template.md));
     legacy/hand-written tickets use `### Discussion`, `Ref:`, or a bare URL.
     Only some older tickets literally say `Source discussion:`. Match the
     reference, not the label.
  2. **`bodyText` rewrites URLs into short refs.** Query 3 returns GraphQL
     `bodyText`, which normalises
     `https://github.com/tailor-professional-service/knowledge/discussions/149`
     down to `tailor-professional-service/knowledge#149`. A regex written
     against the REST `.body` URL shape matches nothing on the payload the
     sweep actually uses. Either match both forms (above) or re-fetch
     `.body` over REST — never assume the two are the same text.

  Presence = forward-linked → **do not backfill**. Extract the number and
  confirm it is the discussion being reconciled (a ticket may cite a _different_
  discussion — that is a fan-out, not a backfill). Only a body with **no**
  discussion reference at all is a backfill candidate.

  Sanity-check the result before acting on it: if a backfill batch is large, or
  every candidate was filed recently by the triage skill, the detector is wrong —
  not the tickets.

- **Shipped?** (lifecycle only) A linked ticket counts as shipped only when **the
  issue is closed AND its milestone version has a published release**. A milestone
  alone is not enough. A ticket closed with **no milestone** → can't name a
  version → flag, never announce.
- **Duplicate?** A linked ticket with `stateReason == DUPLICATE` (or the
  `duplicate` label) is not the real ticket. Resolve the canonical (query 8),
  re-point the discussion at it, then re-derive state. If unresolvable → flag.
- **Earmarked, and for which version?** (lifecycle only) Match comments by the
  **earmark template shape** (`targeted for release **vX.Y.Z**` / `moved to
**vX.Y.Z**`) that reference the ticket — **by shape + ticket link, not author
  login**, since scheduled and manual runs may post under different accounts. Take
  the most recent and extract the version with `v(\d+\.\d+\.\d+)`; that is "the
  version last announced". If the ticket's milestone version differs → an update
  is due. The `v1.5.0` token is identical in JP or EN, so this is
  language-independent.
- **Release-announced?** (lifecycle only) A comment matching the **release
  template shape** (`addressed in **vX.Y.Z** of …`) referencing the shipped
  version, corroborated by the `status: resolved` label — again matched by shape,
  not author, so a handoff or scheduled run won't re-announce.
- **Disposition hint in replies?** Read non-operator replies before proposing a
  ticket. Maintainer pushback ("by design"), an alternative ("use X / there's a
  workaround"), "belongs in <other component>", or an unanswered request for info
  all mean _don't file_ → route to `needs-info` / out-of-scope / wontfix. Replies
  can equally reinforce filing.

This is why the comment templates below keep a consistent, parseable shape — the
skill reads its own past comments back.

## Write mutations

### Resolving node IDs — do this before every mutation

Every mutation below takes an opaque node id (`D_kwDO…` for a discussion,
`DC_kwDO…` for a comment, `LA_kwDO…` for a label). **Opaque ids fail silently
in the worst possible way**: a wrong-but-well-formed id does not error — it
resolves to some _other_ object, potentially in an unrelated public repo, and
the mutation succeeds. There is no repo scoping in the id itself.

Rules, non-negotiable:

1. **Never hand-write, guess, pattern-match, or carry over a node id.** Ids that
   share a prefix (`D_kwDOQUG6j84…`) are _not_ related — the suffix is the whole
   identity.
2. **Resolve by `number` in the same run that mutates**, from the canonical repo,
   and key the result so a mix-up is impossible:

   ```bash
   # Resolve every target up front; aliases keep number→id bound together.
   gh api graphql -f query='
   query{ repository(owner:"tailor-professional-service",name:"knowledge"){
     d272:discussion(number:272){ id number }
     d284:discussion(number:284){ id number }
   } }' --jq '.data.repository | to_entries[] | "\(.value.number)\t\(.value.id)"'
   ```

   If a discussion enters the queue late (e.g. an operator adds it during the
   approval step), it will not be in the batch you resolved earlier — **re-resolve
   it**. Do not reach for a nearby id.

3. **Verify the mutation landed on the intended target.** `addDiscussionComment`
   returns `comment{ url }` — assert it contains the expected
   `tailor-professional-service/knowledge/discussions/<number>` _before_
   reporting success:

   ```bash
   URL=$(gh api graphql -f query='
   mutation($discId:ID!,$body:String!){
     addDiscussionComment(input:{discussionId:$discId, body:$body}){ comment{ url } }
   }' -F discId="$DISC_ID" -F body="$BODY" --jq '.data.addDiscussionComment.comment.url')

   case "$URL" in
     *"tailor-professional-service/knowledge/discussions/$NUM"*)
       echo "ok #$NUM -> $URL" ;;
     *)
       echo "MIS-TARGETED: expected discussion #$NUM, posted to $URL" >&2
       echo "Delete it immediately, then stop and report." >&2
       exit 1 ;;
   esac
   ```

   Same idea for issue mutations: check the returned `html_url`/`url` is under
   `tailor-inc/platform-planning`.

If a comment does land on the wrong target: **delete it first**
(`deleteDiscussionComment(input:{id:$commentId})`), then report the incident to
the operator with the repo, discussion, and comment id. Do not post the
corrected comment and leave the stray one behind.

### Post a comment on a discussion (approval-gated)

```bash
gh api graphql -f query='
mutation($discId:ID!,$body:String!){
  addDiscussionComment(input:{discussionId:$discId, body:$body}){ comment{ url } }
}' -F discId="$DISCUSSION_ID" -F body="$BODY"
```

### Add / remove discussion labels

```bash
# add (e.g. pf-triaged, the component LABEL, status: resolved)
gh api graphql -f query='
mutation($id:ID!,$labels:[ID!]!){ addLabelsToLabelable(input:{labelableId:$id, labelIds:$labels}){ clientMutationId } }' \
  -F id="$DISCUSSION_ID" -F labels[]="$LABEL_ID"

# remove
gh api graphql -f query='
mutation($id:ID!,$labels:[ID!]!){ removeLabelsFromLabelable(input:{labelableId:$id, labelIds:$labels}){ clientMutationId } }' \
  -F id="$DISCUSSION_ID" -F labels[]="$LABEL_ID"
```

### Create a ticket from a discussion (approval-gated)

**Reuse `pf-feedback-triage`'s machinery** — do not re-document it here:

1. Build title + body per [../../pf-feedback-triage/references/issue-template.md](../../pf-feedback-triage/references/issue-template.md). The body **must** end with that template's mandatory forward link — `**Source:** $DISCUSSION_URL`. Detection keys on the discussion **URL**, not the marker text (see State detection → _Forward-linked?_), so don't invent a different marker here.
2. Create the issue + add to project + set Component/Module + Level per [../../pf-feedback-triage/references/project-routing.md](../../pf-feedback-triage/references/project-routing.md), choosing `PROJECT` / `PROJECT_COMPONENT` from the active component.
3. **Do not set a milestone on creation** — a newly-filed ticket has no known target version yet. Milestone assignment happens later, as its own approval-gated proposal once a version is knowable (see below).
4. Then post the link comment (template below) and set `pf-triaged`.

### Create / set a ticket's milestone (approval-gated)

Milestone-earmark writes (initial earmark, correcting a stale one, re-targeting
an open ticket to the next version) are proposals like any other customer-facing
action — never auto-applied. The skill still never creates a **release**.

```bash
# Create the milestone if it doesn't exist yet (release milestones can lag the release)
gh api repos/tailor-inc/platform-planning/milestones \
  -f title="${MILESTONE_PREFIX}X.Y.Z" -f state=open

# Set (or move) the issue's milestone — look up the milestone number from query 5's output
gh api repos/tailor-inc/platform-planning/issues/$NUM \
  -X PATCH -F milestone=$MILESTONE_NUMBER
```

### Backfill the forward link on an existing ticket (auto)

Only when the ticket body contains **no** discussion reference at all (per
State detection → _Forward-linked?_ — match on `knowledge/discussions/(\d+)`,
**not** on a marker string). Append using the same `**Source:**` marker
`pf-feedback-triage` writes, so the two skills stay consistent. Preserve the
existing body; pass via stdin to avoid shell evaluation:

```bash
# Guard first — never append if the body already references any discussion.
BODY=$(gh api "repos/tailor-inc/platform-planning/issues/$NUM" --jq .body)
if printf '%s' "$BODY" | grep -qE 'knowledge/discussions/[0-9]+|tailor-professional-service/knowledge#[0-9]+'; then
  echo "pp#$NUM already forward-linked — skip"
else
  printf '%s\n\n**Source:** %s' "$BODY" "$DISCUSSION_URL" \
    | gh issue edit "$NUM" --repo tailor-inc/platform-planning --body-file -
fi
```

## Comment templates

Keep the version as `v<semver>` and always include the ticket link — that is what
makes re-runs parseable. Post in the discussion's prevailing language per the
component's instructions (for app-shell: English only; a bot appends the JP
translation).

**Link (discussion ↔ ticket):**

> Tracked on the platform board: tailor-inc/platform-planning#NNNN

**Earmark (ticket got a `MILESTONE_PREFIX X.Y.Z` milestone, e.g. `AppShell v1.4.0`):**

> Update: this is now targeted for release **vX.Y.Z** (tailor-inc/platform-planning#NNNN).

**Earmark changed (milestone moved from vA.B.C to vX.Y.Z):**

> Update: the target release for this has moved to **vX.Y.Z** (previously vA.B.C) — tailor-inc/platform-planning#NNNN.

**Release shipped:**

> This has been addressed in **vX.Y.Z** of `PRIMARY_PACKAGE` — please update and confirm. (tailor-inc/platform-planning#NNNN)

Pair the release comment with the `status: resolved` label.

## Slack digest

**Recipient — resolved at run time, never hard-coded:**

1. `--slack-user <id>` (DM) or `--slack-channel <id>` (channel) if passed — this is how a scheduled routine sets it, in the routine's own definition, so the id lives with the schedule and not in this skill.
2. else the **authenticated Slack user** (self-DM) — resolve the connected Slack MCP's own user id and DM that. An unattended run therefore digests to whoever's Slack identity it runs as.
3. else (Slack MCP unavailable, e.g. a headless run) — print the digest in the run output instead.

The digest is **action-oriented**: only items that need attention appear. In-sync
discussions are collapsed to a single count, never listed individually. When
`--all`, render one section per component.

**Link formatting (always):** make every reference a clickable markdown link to
the correct host — never plain `#NNN`.

- Discussion → `https://github.com/tailor-professional-service/knowledge/discussions/{number}`
- Ticket → `https://github.com/tailor-inc/platform-planning/issues/{number}`

Prefer the `url` field the queries already return; if building a link by hand use the `number` (not the node id), and double-check it goes to the matching host (discussion numbers are not ticket numbers).

```
*<component> feedback sweep — <date>*   (27 in scope · 18 in sync, no action)

*Applied automatically (N)*
• [#287](disc-url) — pf-triaged set (newly classified <component>)
• [pp#1152](issue-url) — backfilled Source discussion link

*Awaiting your approval (M)*
1. LINK     [#221](disc-url) → [pp#1098](issue-url)         (existing ticket, unlinked)
2. EARMARK  [#76](disc-url)  → [pp#484](issue-url) v1.5.0   (milestone set; not told)
3. RELEASE  [#140](disc-url) → [pp#1098](issue-url) v1.4.0  (shipped; + status: resolved)
4. RE-LINK  [#76](disc-url)  → canonical [pp#484](issue-url) (linked ticket was a duplicate)
5. NEW      [#282](disc-url) → propose ticket               (no ticket; looks like a bug)

*Needs a human (flag-only) (K)*
• [#209](disc-url) — fuzzy hit, low confidence it's about the component itself
• [#68](disc-url) — ticket reopened while discussion is status: resolved (revert?)
• [pp#779](issue-url) — milestone removed after an earmark (de-scope?)
```

If Slack is unavailable, print the same digest in the response instead.
