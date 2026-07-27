# Discussion fetch, filter & classify

Phase 1 (FETCH) and Phase 2 (CLASSIFY) of `pf-feedback-triage`.

## Fetch

Page through Discussions in the "Platform Feedback" category, newest first,
bounded by `SINCE` (default 14 days ago, compared against `updatedAt`).

```bash
# SINCE is an ISO date (YYYY-MM-DD) computed in Phase 0.
gh api graphql --paginate \
  -f query='
  query($cursor: String) {
    repository(owner: "tailor-professional-service", name: "knowledge") {
      discussions(first: 50, after: $cursor,
        categoryId: "DIC_kwDOQUG6j84C4k5F",
        orderBy: {field: UPDATED_AT, direction: DESC}) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id number title url updatedAt
          body
          labels(first: 20) { nodes { name } }
          comments(first: 30) { nodes { body } }
        }
      }
    }
  }' \
  -F cursor=null \
  | jq -c '.data.repository.discussions.nodes[]'
```

`--paginate` follows `pageInfo` automatically when the query exposes a
`$cursor` variable and `pageInfo { hasNextPage endCursor }`.

## Filter (drop a Discussion when ANY holds)

1. `updatedAt` < `SINCE`.
2. Labels include `pf-triaged` (already handled by this skill).
3. Labels include `status: resolved` (feedback is closed — do not re-open as an Issue).
4. Body or any comment contains a back-link to the planning repo:
   substring `github.com/tailor-inc/platform-planning/issues/`.

```bash
# $d is one Discussion JSON line from the fetch above.
labels=$(printf '%s' "$d" | jq -r '[.labels.nodes[].name] | join(",")')
case ",$labels," in *,pf-triaged,*|*,"status: resolved",*) echo skip; continue;; esac
if printf '%s' "$d" | jq -r '.body, (.comments.nodes[].body)' \
   | grep -q 'github.com/tailor-inc/platform-planning/issues/'; then
  echo skip; continue
fi
```

## Classify (title-prefix primary, label secondary)

Discussion labels are inconsistent, so the title prefix is the primary signal —
`platform-feedback` always prepends `title_prefix` (e.g. `[sdk]`).

Resolution order, first match wins:

1. **Title prefix** → component, via the `title_prefix` field of each component
   in `COMPONENTS` (case-insensitive, leading-bracket match):
   `[sdk]`→sdk, `[erp-kit]`→erp-kit, `[module]`→erp-kit-module,
   `[app-shell]`→app-shell, `[platform]`→platform-general, `[other]`→others.
2. **GitHub label** → component, by matching a label name against each
   component's `label` field (`SDK`, `erp-kit`, `AppShell`). Note `erp-kit` and
   `erp-kit-module` share the same `label`, so the title prefix is what
   separates them — fall back to the erp-kit-vs-module reclassification below.
3. **Neither matches** → `needs-component`.

The resolved component yields its routing target via the `project` and
`project_component` frontmatter (see `project-routing.md`). `others` and
`platform-general` both resolve to a component but `others` has an empty
`project_component`, so it is treated as `needs-component` for routing.

### erp-kit: process vs module

Two components share the erp-kit surface — `erp-kit` (process/framework →
project 15) and `erp-kit-module` (a business module → project 17). Going
forward `platform-feedback` files module feedback with the `[module]` prefix
and a captured `### Module` value, so classification is deterministic. For the
**backlog** of older `[erp-kit]`-prefixed discussions, reclassify to
`erp-kit-module` when the body or title names one of the 17 modules
(`accounting / approval / audit / business-partner / coa-management /
finance-ledger / financial-accounting / integration / inventory /
item-management / manufacturing / organization / primitives /
product-management / purchase / sales / user-management`). This is a proposal
only — surface it in the Phase 4 batch table (`→ project 17, Module=inventory`)
so the user confirms or overrides the project and module per row. When erp-kit
work is module-shaped but no single module is clear, route to project 17 with
Module unset (`needs-module`) and ask in the table.

## Parse body fields (best-effort, never crash)

The body follows `../../../team-ps/platform-feedback/references/post-template.md`. Extract:

- **Impact** — the line under `### Expected Impact` matching `I[0-3]`. Default
  `I2` if absent.
- **Feedback Type** — the value under `### Feedback Type` (`Feature Request` /
  `Pain Point` / `General Feedback`). Default `General Feedback` if absent.
- **Module** (erp-kit-module only) — the value under `### Module`, matched to
  one of the 17 module options. This is the captured value `platform-feedback`
  writes for module feedback; it sets project 17's `Module` field directly. If
  absent, fall back to the keyword reclassification above; if still unresolved,
  treat as `needs-module`.

Manually-authored Discussions may not follow the template; on any parse miss,
use the defaults and continue. Never abort classification on a parse failure.
