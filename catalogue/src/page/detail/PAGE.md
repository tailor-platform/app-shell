---
slug: page/detail
name: Detail Page
category: page
description: The screen for a single record — its summary, its contents, the records around it, and the actions available on it
requiredImports:
  [
    Layout,
    DescriptionCard,
    Card,
    Table,
    Badge,
    Alert,
    ActionPanel,
    ActivityCard,
    Grid,
    MetricCard,
    DocumentProgressCard,
  ]
tags: [detail, record, document, single-record, actions, related-records, two-column, line-items]
do:
  - A screen showing exactly one record — an order, a receipt, an invoice, a supplier, an item
  - The record has a lifecycle someone moves it through, or other records created from it
  - Someone reading the record needs to understand its current state, and may want to act on it
dont:
  - The screen shows a set of records — that is a collection
  - The record is a row's worth of fields, better opened in a Sheet from the list it belongs to
  - Creating a new record — that is a form; this pattern is for reading and amending one that already exists
---

# page/detail

The screen for a **single record**. Two columns: the record itself on the left,
and on the right the actions available on it plus the context that sits around
it rather than inside it.

It is not only for documents. Orders, receipts and invoices use the fullest
version of it; master-data records — a supplier, an item, a site — use the same
shape with fewer sections, typically a summary and a few actions and nothing
else. What follows covers the full version; skip what a given record doesn't
have.

## When to Use

- A screen showing exactly one record
- The record has a lifecycle someone moves it through, or other records created from it
- Someone reading the record needs to understand its current state, and may want to act on it

## What the page answers

The records this applies to vary widely in what they mean and what they carry.
For example, a purchase order might carry prices and an approval chain where a
goods receipt carries neither. What stays the same is the sequence someone works
through when they open the page, and the layout follows that sequence:

1. **What is this record, and is it still live?** → the alerts, then the summary
2. **What is in it?** → the line items
3. **What is it connected to, and what has it caused?** → sources, related records, the journal
4. **What can I do about it?** → the actions in the right-hand column

A record skips whichever of these it doesn't have. It never reorders the ones it
does.

## High-level layout

An example, with more cards filled in than most records will have:

```
+---------------------------------------------------------+
| Layout.Header   Purchase order PO-24118    breadcrumb   |
+----------------------------------+----------------------+
| Layout.Column (main)             | Layout.Column right  |
|  Alert   terminal states only    |  ActionPanel         |
|                                  |   Duplicate          |
|  DescriptionCard  Summary        |   Amend / Edit       |
|   identity · statuses            |   Create receipt     |
|   supplier → link                |   Close              |
|                                  |                      |
|  Card  Source documents  (up)    |  Card  External      |
|  Card  Line items                |   QBO · Bill 1042    |
|  Card  Goods receipts  (down)    |                      |
|  Card  Journal                   |  ActivityCard        |
|  Card  Reference documents       |   History            |
|                                  |                      |
|  «extension seam»       last     |                      |
+----------------------------------+----------------------+
```

Below 1024px wide, the right-hand column drops beneath the main one. That is why
nothing needed to _understand_ the record may live only on the right: that column
carries actions and surrounding context, not content.

## Main column

Cards in this order. Skip what doesn't apply; don't reorder what does.

| Card                  | Appears when                                               | Job                                                |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| Status alerts         | A terminal state, or one whose consequence is invisible    | Explain the missing actions before they're hunted  |
| Summary               | Always                                                     | Identity and current state                         |
| Upstream / exceptions | The line items can't be read without it; a block is active | Where the contents came from; what's holding it up |
| Line items            | The record has contents                                    | The record's own content                           |
| Related records       | The relationship is possible                               | What this record has caused                        |
| Reference documents   | Files hang off the record                                  | Attachments, with a viewer link                    |
| Extension seam        | A relationship exists this app can't render                | Mark where another module mounts                   |

The **summary is the only card that always appears.** Line items are on most
documents but not on all records — a supplier or a site has no contents to list,
and simply omits the card rather than showing an empty one.

### 1. Status alerts — above everything

When a record reaches a state that removes its actions, say so. Otherwise the
action list silently shortens and the reader goes looking for a button that is no
longer there.

Write one alert per state, not a single generic "this record is closed":

- **Settled / completed** → `success`. The work finished and the figures are frozen.
- **Cancelled / voided** → `neutral`. Nothing happened; a new record is needed.
- **Live but consequential** → `info`. The next action can't be undone, or a control someone expects genuinely doesn't exist.
- **Rejected back to draft** → `warning`. Without it, a bounced record is indistinguishable from a fresh one.

These are **persistent, not dismissible**. The alert is derived from the
record's state, so it belongs on screen for exactly as long as the record is in
that state — don't pass `dismissible`. Transient feedback after an action is
`useToast`, never an `Alert`.

`Alert` is compound: `Alert.Root variant` wrapping `Alert.Title` and
`Alert.Description`.

> **Where this came from.** This is the newest and least-proven part of the
> pattern. It comes from the erp-kit module templates, which annotate every
> terminal state; the older composite `erp` app leaves them mostly unannotated,
> and neither client app reviewed for this entry has them at all. The reasoning
> is sound — a state that removes actions should explain itself — but treat it
> as a recommendation rather than settled practice.

### 2. Summary — always first

One `DescriptionCard`, `columns={3}`, titled for the record ("Purchase order
information"). Self-containing — never wrap it in a `Card.Root`. Field order:

1. **Identity** — the document number or code first, `meta: { copyable: true }`, because it's the thing people paste into chat
2. **Statuses** — the record's own, then any derived ones (see below)
3. **The other party and place** — the supplier, customer or site the record is with, as a `type: "link"` with an `hrefKey` pointing at a pre-computed href, so an unresolvable id degrades to plain text rather than a dead link
4. **A `{ type: "divider" }`**, then dates, commercial terms and external references

> **Only fields the record can actually answer.** A goods receipt has no
> supplier and no path to one, so it gets a _count of source documents_ instead,
> and the supplier lives on the order the receipt points at. Deriving a field
> from data already loaded — a line count, an order total, a resolved source set
> — is fine and common. Inventing one the schema can't answer is how a page
> ships broken.

#### Its own status, and the ones it derives

A record usually shows more than one status. It has its **own** status — where
it is in its own lifecycle — and it often also shows **derived** statuses that
summarise the state of related records or external events: whether the ordered
goods have arrived, whether the invoice has been paid, whether a sync to an
external system succeeded.

Show each one as its own field with its own badge. Collapsing them into a single
value loses exactly what the page exists to convey. The record's own status is a
filled semantic variant; the derived ones are `outline-*`, so the reader can see
at a glance which status the record itself owns.

> **Never put a control on a derived status.** Not a select, not a "mark as
> received" action, not a row-level override. Those values are written by
> whichever module owns receiving, or billing, or the integration — a control
> here would claim an ownership this screen doesn't have. Render the value, and
> put the records behind it in a related-records card.

#### Conditional and empty fields

A field with no value renders an em dash by default (`emptyBehavior: "dash"`).
The alternatives are to hide it (`emptyBehavior: "hide"`) or to leave it out of
the array entirely — and both move everything after it.

`DescriptionCard` lays its fields out as a grid in DOM order, so **removing a
field shifts every field after it into the vacated slot**. A field that sat third
in a row moves to second. Two records of the same type can then present the same
information in different positions, which is exactly what a summary card should
not do.

So:

- **Default to the dash.** For any field that is part of what this record type always shows, leave it rendered and let it show an em dash. Position stability is worth more than density.
- **Remove a field only when its absence is itself meaningful** — a close reason on a record that was never closed, a rejection note on one never rejected. There, the reader isn't comparing positions, and an em dash would imply the field applies when it doesn't.
- **Put conditional fields at the end of their section.** A `{ type: "divider" }` starts a new grid, so a field removed after a divider can only shift fields within that same section. Grouping the conditional ones last means removal shifts nothing the reader is comparing.

A second `DescriptionCard` is right when a group of fields has a different owner
or a different edit path from the first — system-derived versus operator-entered.

### 3. Upstream sources and exceptions

- **Upstream sources** go _above_ the line items when the items can't be read without them. Document number, status badge, link out.
- **Exceptions and blocks** — an active hold, a failed validation — go directly under the summary, styled destructive, rendered only when non-empty. This is the one place a row-level action belongs outside the right-hand column: the row that names the block carries the control that clears it.

### 4. Line items

`Card.Root` → `Card.Header` (title, plus a one-line description where the
columns need explaining) → `Card.Content className="px-0!"` → `Table.Root`. Use
a plain `Table`, not a `DataTable`: these rows are bounded and already fetched,
so a toolbar and pagination buy nothing.

Columns, left to right:

1. **Identity** — the item name, with the SKU beneath it in muted mono `text-xs`. Two facts, one column.
2. **The record's own numbers** — quantity, unit of measure, unit price
3. **Derived columns** — received, billed, fulfilled. These are the per-line counterpart of the derived statuses above, and they're what make a line table worth opening. Show the actual figure with a small muted delta beside it when it differs from target, rather than a separate variance column.
4. **Subtotal**, derived, last

Numeric columns take `align="right"` on **both** the head and the cell, and
`tabular-nums` so digits line up. Fetch the items with an explicit sort so the
order is stable across reloads. An empty table is an explicit muted paragraph
inside the card, never a bare header row.

> **A total row is a claim, not a decoration.** Add `Table.Footer` only where
> the column genuinely sums. An order priced in one currency totals cleanly. A
> goods receipt often cannot total its quantities at all: one shipment might take
> 6 cases of one item and 120 kilograms of another, and there is no unit those
> add up in. Likewise omit a currency symbol on a record whose schema has no
> currency to qualify it. Both mistakes look like polish and read as
> fabrication.

### 5. Related records — what this one caused

One card per _type_ of related record: receipts against an order, invoices
against a receipt, settlements, due schedules, the posted journal. Each is a
small table of document number → status → date → the figure that matters, with
the number linking to that record's own page.

- Each row's status badge is **that record's own status**, so it takes the filled semantic variant — the same treatment it gets on its own page. `outline-*` is for a record's derived statuses, and a pointer row has none.
- Order the cards the way the work runs — goods before money
- The empty state names the relationship ("No goods receipts linked to this order"), so the reader learns the relationship exists and is simply unused
- Hide a card entirely only while the relationship is _impossible_ — a draft can have no receipts yet. Once it is possible, show it empty rather than hiding it
- Group by parent where the hierarchy is real — orders, then the receipts under each
- These are pointers, not reports. If a related collection genuinely needs filtering and paging, that's `pattern/list/dense-scan` on its own route, linked from here

#### When a relationship is a card, and when it is a field on the summary

Not every related record deserves a card. The question comes up for every
relationship the record has, and the answer follows from how many records are on
the other end:

**A to-one relationship is a link field on the summary. A to-many relationship
needs a card.**

Typically, if the record has a parent it has only one, so the parent appears as
a link on the summary description card. If it has child records there are many
of them and their statuses matter, so they go in a table inside their own card —
which is more than a field could carry.

The exception worth knowing is a to-many _upstream_: a receipt consolidating
three orders, an invoice raised against several receipts. That is many records on
the other end, so it takes a card of its own, placed above the line items. Count,
not direction, is what decides.

The other case for a card is a relationship the API cannot traverse. A
polymorphic link — a `sourceType` / `sourceId` pair with no union type and no
relation field on either side — cannot be followed in a GraphQL query in either
direction, so it has to be resolved by the page or left to an extension seam. A
field cannot express it.

If you find yourself building a card to display a single supplier, that
relationship belongs on the summary instead.

#### The journal is a special case

A record's accounting effect belongs on the record. Before posting it is a
_preview_ computed from what the page already holds, and it must be labelled as
one. After posting it is the real ledger, fetched by document number — and
posting often books more than one entry, so fetch the whole set rather than the
obvious one.

#### Navigating out versus checking against

A related record is normally a link. Where someone is cross-checking rather than
leaving — matching an invoice against its receipts — the document number opens a
compact modal instead, so their place survives the check. Pick one per card and
stay consistent within it.

### 6. Reference documents

Files that hang off the record — a supplier's signed contract, a scanned or
OCR'd delivery note, a photo of damaged goods. One card titled **Reference
documents**, near the end of the main column, listing each file with a viewer
link, and an upload control gated on the record's state.

Cards are independent units, so this one can be composed as a sibling of the
rest rather than nested inside whatever renders the record's own fields.

### 7. Extension seam — always last

Where a relationship exists but this app can't render it — a polymorphic link,
or content another module owns — leave a registered seam rather than a missing
card. It goes _after_ the record's own cards: borrowed content doesn't outrank
what the reader came for. AppShell ships no slot primitive, so this is an
app-level concern; whatever the mechanism, a seam must never reach an end user
unfilled.

## Secondary (right-hand) column

Ordered most-actionable to most-ambient, because below 1024px this becomes the
page's footer.

### 1. `ActionPanel` — first, titled "Actions"

Everything here does something _to_ this record: mutates it, moves it through its
lifecycle, or creates the record that comes next in the workflow.

A serviceable starting set, in order:

| Action                | When                                              |
| --------------------- | ------------------------------------------------- |
| Download PDF          | records that get sent to another party            |
| Duplicate             | almost always                                     |
| Edit                  | while the record is still a draft                 |
| Amend                 | once it's committed and a change has consequences |
| Create «child record» | when the lifecycle allows the next document       |
| Close / Cancel        | the terminal transitions                          |

Icons come from `lucide-react`, one per verb. Use the same glyph for the same
verb on every record, so people learn the panel once:

| Verb                        | Icon                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| Edit (a draft)              | `Pencil`                                                                |
| Amend (a committed record)  | `FileEdit`                                                              |
| Duplicate                   | `Copy`                                                                  |
| Download PDF                | `Download`                                                              |
| Delete (a draft)            | `Trash2`                                                                |
| Submit / Post / send onward | `Send`                                                                  |
| Approve / Confirm           | `Check`                                                                 |
| Reject                      | `Ban`                                                                   |
| Cancel / Close              | `XCircle`                                                               |
| Redraft / reopen            | `RotateCcw`                                                             |
| Release (a hold)            | `Unlock`                                                                |
| Receive                     | `PackageCheck`                                                          |
| Create «goods receipt»      | `PackagePlus`                                                           |
| Deactivate / Reactivate     | `UserX` / `UserCheck` for people, `ShieldOff` / `ShieldCheck` for roles |
| Revision history            | `History`                                                               |

Pass the bare element — `icon: <Pencil />` — and let `ActionPanel` size it.

**Never a back button — not here, and nowhere else in the top-right.** Two
separate reasons, and each is sufficient on its own. Navigation is not an action
on the record, so it does not belong in a panel of them; and the top-right of a
screen is not where anyone looks to go back. Back is the breadcrumb's job, top
left, where the reader already came from. A panel opening with "Back to orders"
also trains people to read it as a menu rather than as the set of things they can
do to what they are looking at.

Mechanics:

- **Gate rows by spreading them in** against the record's own status, so the panel only ever offers what's legal now. A hidden row beats a disabled one.
- **Bind `loading`** on any row that fires a mutation, from that mutation's own in-flight state; `variant="destructive"` for the destructive ones.
- **Don't pre-compute a disabled state the server owns.** Some commands refuse on state the page can't see — cancelling once a line is billed, closing before every line settles. Leave the action enabled and let the failure surface the server's own sentence. A guessed disabled state drifts from the command and leaves a dead button with no explanation.
- **Report both paths.** Success and failure both toast; no silent writes.
- **An action needing input or confirmation** opens a dialog from the same place — see `pattern/interaction/confirm`. The confirm button mirrors the command's own condition chain and is **no stricter**: making a reason unconditionally required when the command only wants it in one branch blocks the clean path. Say in the dialog what the action does when the button doesn't make it obvious — that rejecting returns the record to draft, or that posting can't be undone.
- **Export a predicate** (`hasOrderActions(status)`) alongside the panel, so the screen can decide whether it renders at all.
- `ActionItem` isn't exported; annotate an actions array as `ActionPanelProps["actions"]`.

**Terminal states.** The lifecycle actions all drop out, and it's the alert at
the top of the record — not the panel's own thinness — that explains their
absence. The always-available utilities legitimately outlive the workflow: a
settled order can still be duplicated or downloaded, so the panel often survives
carrying only those. Render it when something is genuinely in it, omit it
entirely when nothing is, and never pad it with navigation to stop it looking
bare.

### 2. External system — under the actions

When the record is mirrored outside the platform — Shopify, QuickBooks, a WMS —
one card naming the system, linking to the record over there, and saying when it
last synced. Omit the card entirely when there's no such link; never render it
empty.

### 3. History — last

Revisions, or an audit trail of who changed what, as an `ActivityCard`. It's
context, not content: someone who never opens it should still understand the
record. Where the trail is long enough to dominate the column, move it behind a
`Sheet` opened from the actions instead — read alongside the record, never
instead of it.

## Optional cards

None is expected; add one only when the record earns it.

- **Metric strip** — headline figures. Either lead the main column with `MetricCard`s in a `Grid` (`columns={{ initial: 1, md: 2, xl: 4 }}`, never one per row), or put a single number in the right-hand column above the actions. Not both.
- **`DocumentProgressCard`** — a lifecycle or fulfilment breakdown. Derive `percent` and `segments` in the consumer.
- **A card that measures against intent** — for records that are promises later fulfilled by other records, an ordered/received/billed grid. Hide it while there's nothing yet to reconcile: an empty reconciliation table is worse than none. One plain-English line under the title ("3 units still to receive") beats making the reader subtract.

## Editing

**Prefer editing in place.** Where a field is editable in the record's current
state, give it an affordance — a pencil beside the value — and swap it for an
input where it already sits. The value doesn't move between reading and editing,
so someone learns one screen position per field instead of two, and the page
doesn't rearrange itself around the act of editing.

That is the default. Escalate only when the edit genuinely can't be done a field
at a time:

| Scope                                                | Mechanism                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| One field, or a handful independent of each other    | **In place**, on the summary or the line row                |
| A coherent group that must validate or save together | A **dialog** opened from the actions                        |
| The whole record and all its line items              | A **sub-route** rendering this screen with the form over it |

What is editable is always the product of two things — the record's lifecycle
state and the reader's permission — resolved into named booleans once, near the
top of the component, and not re-derived inline. Name them for what they permit
(`lineItemsEditable`) or reveal (`showReceiptsCard`), so the JSX reads as intent
rather than as a chain of status comparisons.

In practice this means a draft is broadly editable in place, and a committed
record still has a few fields that are: a delivery date, a note, a currency, a
reference someone needs to correct without amending the whole record. Both
client apps reviewed for this entry work this way — one edits notes in place
behind a pencil, the other edits a range of header and line-item fields inline on
draft and committed orders, with autosave and a save-status indicator in the line
items card header.

A sub-route is a **route-addressable modal**: `/edit` and `/amend` render this
same screen with a dialog over it, so the record stays visible behind the form
and the URL stays shareable. Two things it has to get right:

- **The status gate has to hold on a cold load.** A URL can be typed, bookmarked, or reloaded after someone else moved the record on. When the status no longer permits the form, redirect to the read-only screen and _replace_ the history entry, so Back doesn't bounce into the redirect.
- **Every dismissal path funnels through one handler** — close, cancel, Escape, backdrop, and a successful save all return to the detail URL.

Even fully editable, the screen still reads as a record with editable fields, not
as a form: the cards keep their order, and nothing collects a page-level Save at
the bottom.

## When a tab strip is warranted

**One scrolling column is the shape.** Everything about the record — its
summary, its contents, its related records — belongs on that one column, and a
tab strip is not a way to tidy it up. A strip is never an alternative view of
data that belongs on the cards.

There is exactly one case that earns a second tab: **the record caused a
separate accounting or inventory record, and that record is the subject of the
tab.** Concretely, and this is the whole list:

| Second tab         | Holds                                                  |
| ------------------ | ------------------------------------------------------ |
| Stock movement     | The inventory transactions posting this record created |
| Journal / GL entry | The general-ledger entries posting this record booked  |

Those qualify because the tab's subject is a _different record type_ with its
own identity, its own posting date, and its own reasons to be wrong — not
another facet of this one. If you cannot name the other record type the tab is
about, there is no second tab.

Explicitly not grounds for a strip:

- The column is long, or scrolling feels like a lot
- The related-record cards are numerous
- A group of fields feels like it deserves its own space
- Someone would like a "details" tab and an "activity" tab

Three rules come with a strip that does qualify:

1. Alerts stay **above** the strip — a terminal-state explanation is a property of the record, not of the tab being read.
2. The `ActionPanel` stays **out** of the tabs. It is driven by the record's status, never by which tab is open.
3. If the second tab's content goes away — nothing posted yet, so no journal — the strip goes with it. **A one-tab strip is worse than no tabs.**

Where a long column genuinely needs wayfinding, the affordance is jump
navigation that tracks scroll position, leaving every card on the page. AppShell
ships no primitive for it, so treat it as a considered addition rather than a
default.

## Width on large screens

**AppShell imposes no maximum width, and this pattern needs one.** The content
area is a flex child with no `max-w-*`, and `Layout` is a full-width grid, so on
a wide monitor the main column keeps stretching: the summary's three columns
spread a short value across a third of a 2560px screen, and line-item tables
pull their first and last columns to opposite edges.

Cap the readable width at the application level — one wrapper around the shell's
content, in the region of 1400px, is what a client app doing this already uses.
Do it once for the app rather than per page, so every screen agrees. AppShell has
no opinion here, which is a gap rather than a decision.

## Links

One treatment everywhere on the page — `DescriptionCard`'s own link fields, the
document numbers in related-record rows, the external-system card:

**`text-primary` at rest, underline only on hover** — the primary colour is what
says "clickable" without a hover, and the resting underline is noise. Add
`underline-offset-4` so the hover underline clears descenders.

- **Internal** (another route in the app) → the `Link` exported by app-shell, with `to`. Never a bare `<a href>` for an in-app route.
- **External** (another system) → `<a target="_blank" rel="noopener noreferrer">` with a lucide `ExternalLink` at `size-3` after the label, so the new tab is signposted. There is no dedicated external-link component; this is the whole recipe.
- **Identifiers** keep their `font-mono` on top of the link style.
- **A `render` field owns its typography.** `DescriptionCard` applies none of its value styling to custom output, so a bare string from `render` reads a size larger than the values around it. Wrap it in `text-sm font-medium text-foreground` — the reference implementation's `Value` helper.

## Patterns for the parts

The page decides the frame; these build what sits in it.

| Need                                               | Pattern                                 |
| -------------------------------------------------- | --------------------------------------- |
| A related collection big enough for its own screen | `pattern/list/dense-scan`               |
| Editing a coherent group of header fields          | `pattern/form/modal`                    |
| A full edit of the record and its line items       | `pattern/form/sectioned` on a sub-route |
| Confirming a destructive transition                | `pattern/interaction/confirm`           |
| Reporting an action's outcome                      | `pattern/interaction/toast`             |

## Reference implementation

A confirmed purchase order: terminal-state alerts, a summary with its own status
plus two derived ones and a link to its source, a to-many upstream card above the
line items, line items with derived columns and a total that legitimately sums, a
related-records card, and a right-hand column of actions, external-system link
and history.

<!-- source: detail.tsx -->

## Constraints

- **`Layout.Header` carries the title and nothing else.** No status badge, no buttons. The status belongs in the summary with the rest of the record's state; the actions belong in the right-hand column.
- **Every action has exactly one home.** If "Create goods receipt" sits in the actions, it doesn't also sit in the goods-receipts card header. Either placement is defensible; both at once makes neither canonical.
- **Every main-column section sits in a `Card.Root`** — except `DescriptionCard`, which contains itself, and `Alert`, which is a banner. No bare `<div>` sections.
- **A table in a card needs ONE geometry change, not two.** Zero the card's padding (`Card.Content className="px-0!"`, or drop `Card.Content`) and leave the table container alone. `Table.Head` and `Table.Cell` already inset their own first and last cells by 24px; padding on the table container stacks on top of that and pushes the first column 24px right of the card title.
- **Bare `YYYY-MM-DD` dates must not use `type: "date"`.** `DescriptionCard` hands the value to `new Date(...)`, which reads a date-only string as UTC midnight and renders the previous day west of Greenwich. Pre-format those as text via `render`. Real timestamps keep `type: "date"`, with `emptyBehavior: "hide"` when nullable.
- **`ActionPanel` is workflow-only.** No navigation, no "view related record" — those are links in the cards that hold them.
- **A page-level Save belongs to a form, not here.** Edits commit per field, per group, or through a sub-route.
- **Write plain, unprefixed Tailwind classes.** The `astw:` prefix is AppShell's own internal one; a consumer's Tailwind build never generates it, so an `astw:` class in application code silently does nothing unless AppShell happens to ship that exact utility. Three cases, in order of preference: use a real prop where the component has one (`Table.Head align`); to **add** a property AppShell doesn't set on that element, a plain utility works; to **override** one it does set, a plain utility loses the cascade — reach for the `!` importance modifier (`px-0!`). Zeroing the card's padding is the only override on this page.
- **Handle all three states.** Loading, error with a retry, and not-found are part of the page. A supplementary query — a rollup, a cross-record aggregate — degrades its own card and must not take the page down with it.

## Anti-patterns

- A "Back to …" row in the `ActionPanel`, or any back affordance in the screen's top-right — the breadcrumb owns navigation, top left.
- An action panel that empties in a terminal state with nothing explaining why — or one kept alive by navigation entries so it doesn't look empty.
- A control on a derived status — a select or "mark received" button over a value another module owns.
- A field the schema can't answer, invented to fill the summary's grid.
- Dropping an empty field from the middle of a summary section, so the fields after it shift position between one record and the next.
- A `Table.Footer` total over quantities in mixed units, or a currency symbol on a record with no currency — fabrication that reads as polish.
- Padding on a table container inside a card (`containerClassName="px-6"`) — double-pads the first column.
- `type: "date"` on a date-only string — renders a day early in negative-offset timezones.
- Splitting a record's own sections across tab panels, or putting the actions beside tabs so they appear to apply to the open panel.
- A card for a single parent record — one parent is a linked field, which says it more clearly.
- Hiding a related-record card once the relationship is possible — an empty card with a named empty state is information; a missing card isn't.
- Collapsing a record's own status and its derived ones into one field, or rendering all of them as filled badges.
- A pre-computed disabled state over a refusal the server owns — a dead button with no sentence.
- A dialog stricter than the command behind it, blocking the path the server would have accepted.
- A `DataTable` for a dozen already-fetched line items.
- Load-bearing content in the right-hand column, which becomes a footer below 1024px.
- An extension seam, internal identifier, or "see docs/…" pointer visible to an end user.
