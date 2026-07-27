# Project routing & mutations

Phase 6 of `pf-feedback-triage`: add a filed Issue to the right Project and set
its routing fields. Which project depends on the resolved component's `project`
frontmatter field:

| component `project` | board                                    | routing field set                           | extra field    |
| ------------------- | ---------------------------------------- | ------------------------------------------- | -------------- |
| `15`                | Tailor Platform (`PVT_kwDOArGW6M4BCOub`) | **Component** (from `project_component`)    | Level = `Task` |
| `17`                | ERP Kit Modules (`PVT_kwDOArGW6M4BZjXw`) | **Module** (from the captured module value) | —              |

Issues for BOTH projects live in `tailor-inc/platform-planning` — only the
project and its fields differ. Status (and project 17's Module Status) are
intentionally left unset for human triage. All user content passes via `-f` /
stdin — never spliced into a query string.

## Field IDs (re-resolve options in Phase 0)

| Thing               | id                                                   |
| ------------------- | ---------------------------------------------------- |
| Project 15          | `PVT_kwDOArGW6M4BCOub`                               |
| P15 Component field | `PVTSSF_lADOArGW6M4BCOubzg0gKbA`                     |
| P15 Level field     | `PVTSSF_lADOArGW6M4BCOubzg0gegs` (Task = `f3027c77`) |
| Project 17          | `PVT_kwDOArGW6M4BZjXw`                               |
| P17 Module field    | `PVTSSF_lADOArGW6M4BZjXwzhUhmdg`                     |

Component option IDs — project 15 (fast-path; re-resolve at runtime):
`platform-core=9282166a console=8a5d08e5 app-shell=478d0b17 tailor-sdk=c2452af8
omakase=e7140748 integrations=b3474166 ai-experiments=e134885f
marketplace=f665e883 docs=fa4b5374 kintai=5b603050 erp-kit=6272c03d`

Module option IDs — project 17 (fast-path; re-resolve at runtime):
`accounting=31536588 approval=4b92c0e3 audit=c3fbee52 business-partner=7099ce37
coa-management=4ee92716 finance-ledger=21b0d9d5 financial-accounting=3b64da38
integration=fd6a7cef inventory=a40baa65 item-management=62541deb
manufacturing=3d731d04 organization=41170180 primitives=bd210a68
product-management=89e343e6 purchase=be0f5c93 sales=09911514
user-management=3d28bd71`

Runtime re-resolution:

```bash
# project 15 Component options
gh project field-list 15 --owner tailor-inc --format json \
  | jq -r '.fields[] | select(.name=="Component") | .options[] | "\(.name) \(.id)"'
# project 17 Module options
gh project field-list 17 --owner tailor-inc --format json \
  | jq -r '.fields[] | select(.name=="Module") | .options[] | "\(.name) \(.id)"'
```

## Add issue to project (both boards)

```bash
# PROJECT_ID is PVT_kwDOArGW6M4BCOub (15) or PVT_kwDOArGW6M4BZjXw (17),
# chosen from the component's `project` field.
# ISSUE_NODE_ID is content.id of the created Issue (not its number).
ITEM_ID=$(gh api graphql \
  -f query='
    mutation($proj: ID!, $content: ID!) {
      addProjectV2ItemById(input: {projectId: $proj, contentId: $content}) {
        item { id }
      }
    }' \
  -f proj="$PROJECT_ID" \
  -f content="$ISSUE_NODE_ID" \
  | jq -r '.data.addProjectV2ItemById.item.id')
```

## Set a single-select field

Both Component (P15) and Module (P17) are single-select — same mutation, different
field + project + option:

```bash
# P15: FIELD_ID=PVTSSF_lADOArGW6M4BCOubzg0gKbA, OPTION_ID=<Component option>
# P17: FIELD_ID=PVTSSF_lADOArGW6M4BZjXwzhUhmdg, OPTION_ID=<Module option>
gh api graphql \
  -f query='
    mutation($proj: ID!, $item: ID!, $field: ID!, $opt: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $proj, itemId: $item, fieldId: $field,
        value: { singleSelectOptionId: $opt }
      }) { projectV2Item { id } }
    }' \
  -f proj="$PROJECT_ID" \
  -f item="$ITEM_ID" \
  -f field="$FIELD_ID" \
  -f opt="$OPTION_ID"
```

## Per-project field-setting

**project 15 route** (components: sdk, erp-kit, app-shell, platform-general, others):

1. Set Component = `project_component` option id (table below).
2. Set Level = `Task` (field `PVTSSF_lADOArGW6M4BCOubzg0gegs`, opt `f3027c77`).

**project 17 route** (component: erp-kit-module):

1. Set Module = the captured module's option id (table below). When the module
   is unknown/blank, skip the Module mutation (leave it unset) and note it.
2. No Level field on project 17 — skip it.

## Mapping: project_component → option id (project 15)

| project_component           | option id                           |
| --------------------------- | ----------------------------------- |
| tailor-sdk                  | c2452af8                            |
| erp-kit                     | 6272c03d                            |
| app-shell                   | 478d0b17                            |
| platform-core               | 9282166a                            |
| docs                        | fa4b5374                            |
| (others, picked at runtime) | resolve from the chosen option name |

## Mapping: module → option id (project 17)

| module               | option id | module             | option id |
| -------------------- | --------- | ------------------ | --------- |
| accounting           | 31536588  | item-management    | 62541deb  |
| approval             | 4b92c0e3  | manufacturing      | 3d731d04  |
| audit                | c3fbee52  | organization       | 41170180  |
| business-partner     | 7099ce37  | primitives         | bd210a68  |
| coa-management       | 4ee92716  | product-management | 89e343e6  |
| finance-ledger       | 21b0d9d5  | purchase           | be0f5c93  |
| financial-accounting | 3b64da38  | sales              | 09911514  |
| integration          | fd6a7cef  | user-management    | 3d28bd71  |
| inventory            | a40baa65  |                    |           |

## Dry-run

When `DRY_RUN=1`, replace each mutation with an echo, e.g.
`echo "[DRY-RUN] addProjectV2ItemById project=$PROJECT_ID content=$ISSUE_NODE_ID"`,
`echo "[DRY-RUN] set <Component|Module>=$OPTION_ID"`,
`echo "[DRY-RUN] set Level=Task"` (project 15 only).
