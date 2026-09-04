---
slug: page/detail
name: Detail Page
category: page
description: Single-record screen — alerts, summary, line items, the documents around it, and a right rail of actions and context
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
tags: [detail, record, document, actions, related-documents, two-column, line-items, status]
do:
  - A screen that owns a route and shows exactly one record — an order, a receipt, an invoice, a supplier
  - The record has a lifecycle someone moves it through, or documents created from it
  - Someone needs to read the record and act on it in the same visit
dont:
  - The screen shows a set of records — that is a collection
  - The record is a row's worth of fields, better opened in a Sheet from the list it belongs to
  - The screen is primarily an editing surface — a detail page never becomes a form; send edits to a sub-route or a dialog
---

# page/detail

Two columns: the record on the left, what you can do about it on the right. That
split holds from the thinnest master-data record to the busiest document, and
what follows is what goes in each column and in what order.

## When to Use

- A screen that owns a route and shows exactly one record
- The record has a lifecycle someone moves it through, or documents created from it
- Someone needs to read the record and act on it in the same visit

## What the page answers

The records differ wildly — a purchase order carries prices and an approval
chain, a goods receipt carries neither and cannot even total its own quantities.
What doesn't differ is the order of the questions someone opens the page asking:

1. **What is this, and is it still live?** — alerts, then the summary
2. **What is on it?** — the line items
3. **What is it connected to, and what has it caused?** — sources, related documents, the journal
4. **What can I do about it right now?** — the rail

A record skips whichever of these it doesn't have. It never reorders the ones it does.

## The shape

```
+---------------------------------------------------------+
| Layout.Header   Purchase order PO-24118    breadcrumb   |
+----------------------------------+----------------------+
| Layout.Column (main)             | Layout.Column right  |
|  Alert   terminal states only    |  ActionPanel         |
|                                  |   Duplicate          |
|  DescriptionCard  Summary        |   Amend / Edit       |
|   identity · every status axis   |   Create receipt     |
|   counterparty → link            |   Close              |
|                                  |                      |
|  Card  Source documents  (up)    |  Card  External      |
|  Card  Line items                |   QBO · Bill 1042    |
|  Card  Goods receipts  (down)    |                      |
|  Card  Journal                   |  ActivityCard        |
|                                  |   History            |
|  «extension seam»       last     |                      |
+----------------------------------+----------------------+
```

Below 1024 the right column drops beneath the main one — which is why nothing
needed to _understand_ the record may live only on the right. The rail carries
actions and ambient context, never load-bearing content.

## Main column

Cards in this order. Only the summary and the line items always appear; the
rest depend on the record. Skip what doesn't apply; don't reorder what does.

| Card                     | Appears when                                            | Job                                               |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| Status alerts            | A terminal state, or one whose consequence is invisible | Explain the missing actions before they're hunted |
| Summary                  | Always                                                  | Identity and current position                     |
| Upstream / exceptions    | The lines can't be read without it; a block is active   | Where the lines came from; what's holding it up   |
| Line items               | Always                                                  | The record's own content                          |
| Downstream & consequence | The related set is possible                             | What this record has caused                       |
| Extension seam           | A relationship exists this app can't render             | Mark where another module mounts                  |

### 1. Status alerts — above everything

When a record reaches a state that removes its actions, say so. Otherwise the
rail silently shortens and the reader goes looking for a button that no longer
exists.

Write one alert per state, not one generic "this is closed":

- **Settled / completed** → `success`. The work finished and the figures are frozen.
- **Cancelled / voided** → `neutral`. Nothing happened; a new record is needed.
- **Live but consequential** → `info`. The next action can't be undone, or a control someone expects genuinely doesn't exist.
- **Rejected back to draft** → `warning`. Without it, a bounced record is indistinguishable from a fresh one.

`Alert` is compound: `Alert.Root variant` wrapping `Alert.Title` and
`Alert.Description`. Transient feedback is `useToast`, never an `Alert`.

### 2. Summary — always first

One `DescriptionCard`, `columns={3}`, titled for the record ("Purchase order
information"). Self-containing — never wrap it in a `Card.Root`. Field order:

1. **Identity** — the document number first, `meta: { copyable: true }`, because it's the thing people paste into chat
2. **Every status axis**, each as its own `type: "badge"`
3. **Counterparties and places** — supplier, customer, site — as `type: "link"` with an `hrefKey` pointing at a pre-computed href, so an unresolvable id degrades to text rather than a dead link
4. **A `{ type: "divider" }`**, then dates and external references

Conditional fields are spread in rather than rendered empty. For a merely
often-null field, `emptyBehavior: "hide"` says the same thing declaratively.

> **Only fields the record can actually answer.** A goods receipt has no
> supplier and no path to one, so it gets a _count of source documents_ instead,
> and the supplier lives on the order the receipt points at. Deriving a field
> from data already loaded — a line count, an order total, a resolved source set
> — is fine and common. Inventing one the schema can't answer is how a page
> ships broken.

#### Status is several axes, and most aren't yours

Business records rarely have one status. An order carries its own lifecycle
status plus receipt and billing progress. **Show every axis as its own badge** —
collapsing them into one field loses exactly what the page exists to convey. The
lifecycle axis is a filled semantic variant; the progress axes are `outline-*`.

Only the lifecycle axis belongs to this screen. The progress axes are stamped by
whichever module owns receiving or billing.

> **Never put a control on a derived axis.** Not a select, not a "mark as
> received" action, not a row-level override. A control there claims an
> ownership this screen doesn't have. Render the value, and put the documents
> behind it in a related-documents card.

#### Card or field?

The test is cardinality, not direction:

**A to-one relationship is a link field on the summary. A to-many relationship —
or one the API can't traverse — earns a card.**

Direction usually follows from that, because a record has one parent and many
children: the parent is a field, the children are cards. But a record with
_several_ sources — a receipt consolidating three orders, an invoice against
several receipts — has a to-many upstream, and that earns a card too. If you
find yourself building a card to show a single supplier, it belongs upstairs.

### 3. Upstream context and exceptions

- **Upstream sources** go _above_ the lines when the lines can't be read without them. Document number, status badge, link out.
- **Exceptions and blocks** — an active hold, a failed validation — go directly under the summary, styled destructive, rendered only when non-empty. This is the one place a row-level action belongs outside the rail: the row that names the block carries the control that clears it.

### 4. Line items

`Card.Root` → `Card.Header` (title, plus a one-line description where the
columns need explaining) → `Card.Content className="px-0!"` → `Table.Root`.
Use a plain `Table`, not a `DataTable`: these rows are bounded and already
fetched, so a toolbar and pagination are furniture with nothing to do.

Columns, left to right:

1. **Identity** — the item name, with the SKU beneath it in muted mono `text-xs`. Two facts, one column.
2. **The record's own numbers** — quantity, unit of measure, unit price
3. **Projection columns** — received, billed, fulfilled. These are the per-line half of the progress axes above, and they're what make a line table worth opening. Show the actual figure with a small muted delta beside it when it differs from target, rather than a separate variance column.
4. **Subtotal**, derived, last

Numeric columns take `align="right"` on **both** the head and the cell, and
`tabular-nums` so digits line up. Fetch the lines with an explicit sort so the
order is stable across reloads. An empty table is an explicit muted paragraph
inside the card, never a bare header row.

> **A total row is a claim, not a decoration.** Add `Table.Footer` only where
> the column genuinely sums. An order in one currency totals cleanly. **A goods
> receipt does not** — one shipment takes 6 cases of one item and 120 kilograms
> of another, and no primary-unit field rescues that. Likewise omit a currency
> symbol on a record whose schema has no currency to qualify it. Both mistakes
> look like polish and read as fabrication.

### 5. Downstream and consequence

What this record has caused, one card per _type_: receipts against an order,
invoices against a receipt, settlements, due schedules, the posted journal.

- Each row's status badge is **that document's own lifecycle status**, so it is the filled semantic variant — the same treatment it gets on its own page. `outline-*` is for a record's secondary axes, and a pointer row has no secondary axis
- Order the cards the way the work runs — goods before money
- The empty state names the relationship ("No goods receipts linked to this order"), so the reader learns the relationship exists and is simply unused
- Hide a card entirely only while the relationship is _impossible_ — a draft can have no receipts yet. Once it's possible, show it empty rather than hiding it
- Group by parent where the hierarchy is real — orders, then the receipts under each
- These are pointers, not reports. If a child collection genuinely needs filtering and paging, that's `pattern/list/dense-scan` on its own route, linked from here

**Navigating out versus peeking.** A related document is normally a link. Where
someone is cross-checking rather than leaving — matching an invoice against its
receipts — the document number opens a compact modal instead, so their place
survives the check. Pick one per card and stay consistent within it.

**The journal is a special case.** A record's accounting effect belongs on the
record. Before posting it's a _preview_ computed from what the page already
holds, and it must be labelled as one. After posting it's the real ledger,
fetched by document number — and posting often books more than one entry, so
fetch the whole set rather than the obvious one.

### 6. Extension seam — always last

Where a relationship exists but this app can't render it — a polymorphic link,
or content another module owns — leave a registered seam rather than a missing
card. It goes _after_ the record's own cards: borrowed content doesn't outrank
what the reader came for. AppShell ships no slot primitive, so this is an
app-level concern; whatever the mechanism, a seam must never reach an end user
unfilled.

## Right column

Ordered most-actionable to most-ambient, because on a narrow screen this becomes
the page's footer.

### 1. `ActionPanel` — first, titled "Actions"

Everything here does something _to_ this record: mutates it, moves it through its
lifecycle, or creates the record that comes next in the workflow.

A serviceable starting set, in order:

| Action                  | When                                              |
| ----------------------- | ------------------------------------------------- |
| Download PDF            | records that get sent to a counterparty           |
| Duplicate               | almost always                                     |
| Edit                    | while the record is still a draft                 |
| Amend                   | once it's committed and a change has consequences |
| Create «child document» | when the lifecycle allows the next document       |
| Close / Cancel          | the terminal transitions                          |

Icons come from `lucide-react`, one per verb. Use the same glyph for the same
verb on every document, so people learn the rail once:

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
left, where the reader already came from. A rail opening with "Back to orders"
also trains people to read the panel as a menu rather than as the set of things
they can do to what they are looking at.

Mechanics:

- **Gate rows by spreading them in** against the lifecycle status, so the panel only ever offers what's legal now. A hidden row beats a disabled one.
- **Bind `loading`** on any row that fires a mutation, from that mutation's own in-flight state; `variant="destructive"` for the destructive ones.
- **Don't pre-compute a disabled state the server owns.** Some commands refuse on state the page can't see — cancelling once a line is billed, closing before every line settles. Leave the action enabled and let the failure surface the server's own sentence. A guessed disabled state drifts from the command and leaves a dead button with no explanation.
- **Report both paths.** Success and failure both toast; no silent writes.
- **An action needing input or confirmation** opens a dialog from the same place — see `pattern/interaction/confirm`. The confirm button mirrors the command's own condition chain and is **no stricter**: making a reason unconditionally required when the command only wants it in one branch blocks the clean path. Say in the dialog what the action does when the button doesn't make it obvious — that rejecting returns the record to draft, or that posting can't be undone.
- **Export a predicate** (`hasOrderActions(status)`) alongside the panel, so the screen can decide whether the rail renders at all.
- `ActionItem` isn't exported; annotate an actions array as `ActionPanelProps["actions"]`.

**Terminal states.** The lifecycle actions all drop out, and it's the alert at
the top of the record — not the rail's own thinness — that explains their
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
record. Where the trail is long enough to dominate the rail, move it behind a
`Sheet` opened from the rail instead — read alongside the record, never instead
of it.

## Links

One treatment everywhere on the page — `DescriptionCard`'s own link fields, the
document numbers in related-document rows, the external-system card:

**`text-primary` at rest, underline only on hover** — the primary colour is what
says "clickable" without a hover, and the resting underline is noise. Add
`underline-offset-4` so the hover underline clears descenders.

- **Internal** (another route in the app) → the `Link` exported by app-shell, with `to`. Never a bare `<a href>` for an in-app route.
- **External** (another system) → `<a target="_blank" rel="noopener noreferrer">` with a lucide `ExternalLink` at `size-3` after the label, so the new tab is signposted. There is no dedicated external-link component; this is the whole recipe.
- **Identifiers** keep their `font-mono` on top of the link style.
- **A `render` field owns its typography.** `DescriptionCard` applies none of its value styling to custom output, so a bare string from `render` reads a size larger than the values around it. Wrap it in `text-sm font-medium text-foreground` — the reference implementation's `Value` helper.

## Optional cards

None is expected; add one only when the record earns it.

- **Metric strip** — headline figures. Either lead the main column with `MetricCard`s in a `Grid` (`columns={{ initial: 1, md: 2, xl: 4 }}`, never one per row), or put a single number in the rail above the actions. Not both.
- **`DocumentProgressCard`** — a lifecycle or fulfilment breakdown. Derive `percent` and `segments` in the consumer.
- **A card that measures against intent** — for records that are promises later fulfilled by other documents, an ordered/received/billed grid. Hide it while there's nothing yet to reconcile: an empty reconciliation table is worse than none. One plain-English line under the title ("3 units still to receive") beats making the reader subtract.

## Edit and amend

Editing is a sub-route rendering this same screen with a dialog over it, so the
record stays visible behind the form and the URL stays shareable. The page never
becomes a form.

- **The status gate has to hold on a cold load.** A URL can be typed, bookmarked, or reloaded after someone else moved the record on. When the status no longer permits the form, redirect to the read-only detail and _replace_ the history entry, so Back doesn't bounce into the redirect.
- **Every dismissal path funnels through one handler** — close, cancel, Escape, backdrop, and a successful save all return to the detail URL.
- Scope decides the mechanism: the whole record and its lines → a sub-route; a coherent group of header fields → a dialog; one field → in place.

## When a tab strip is warranted

**One scrolling column is the shape.** Everything about the record — its
summary, its lines, its related documents — belongs on that one column, and a
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
- The related-document cards are numerous
- A group of fields feels like it deserves its own space
- Someone would like a "details" tab and an "activity" tab

Three rules come with a strip that does qualify:

1. Alerts stay **above** the strip — a terminal-state explanation is a property of the record, not of the tab being read.
2. The `ActionPanel` stays **out** of the tabs. The rail is driven by the record's status, never by which tab is open.
3. If the second tab's content goes away — nothing posted yet, so no journal — the strip goes with it. **A one-tab strip is worse than no tabs.**

Where a long column genuinely needs wayfinding, the affordance is jump
navigation that tracks scroll position, leaving every card on the page. AppShell
ships no primitive for it, so treat it as a considered addition rather than a
default.

## Patterns for the parts

The page decides the frame; these build what sits in it.

| Need                                             | Pattern                                 |
| ------------------------------------------------ | --------------------------------------- |
| A child collection big enough for its own screen | `pattern/list/dense-scan`               |
| Editing a coherent group of header fields        | `pattern/form/modal`                    |
| A full edit of the record and its lines          | `pattern/form/sectioned` on a sub-route |
| Confirming a destructive transition              | `pattern/interaction/confirm`           |
| Reporting an action's outcome                    | `pattern/interaction/toast`             |

## Reference implementation

A confirmed purchase order: terminal-state alerts, a summary with three status
axes, a to-many upstream card above the lines, line items with projection
columns and a total that legitimately sums, a downstream card, and a rail of
actions, external-system link and history.

<!-- source: detail.tsx -->

## Constraints

- **`Layout.Header` carries the title and nothing else.** No status badge, no buttons. The status belongs in the summary with the rest of the record's state; the actions belong in the rail.
- **Every action has exactly one home.** If "Create goods receipt" sits in the rail, it doesn't also sit in the goods-receipts card header. Either placement is defensible; both at once makes neither canonical.
- **Every main-column section sits in a `Card.Root`** — except `DescriptionCard`, which contains itself, and `Alert`, which is a banner. No bare `<div>` sections.
- **A table in a card needs ONE geometry change, not two.** Zero the card's padding (`Card.Content className="px-0!"`, or drop `Card.Content`) and leave the table container alone. `Table.Head` and `Table.Cell` already inset their own first and last cells by 24px; padding on the table container stacks on top of that and pushes the first column 24px right of the card title.
- **Bare `YYYY-MM-DD` dates must not use `type: "date"`.** `DescriptionCard` hands the value to `new Date(...)`, which reads a date-only string as UTC midnight and renders the previous day west of Greenwich. Pre-format those as text via `render`. Real timestamps keep `type: "date"`, with `emptyBehavior: "hide"` when nullable.
- **`ActionPanel` is workflow-only.** No navigation, no "view related record" — those are links in the cards that hold them.
- **The page never becomes a form.** Whole-record editing is a sub-route; a field or two edits in place; a coherent group opens a dialog.
- **Write plain, unprefixed Tailwind classes.** The `astw:` prefix is AppShell's own internal one; a consumer's Tailwind build never generates it, so an `astw:` class in application code silently does nothing unless AppShell happens to ship that exact utility. Three cases, in order of preference: use a real prop where the component has one (`Table.Head align`); to **add** a property AppShell doesn't set on that element, a plain utility works; to **override** one it does set, a plain utility loses the cascade — reach for the `!` importance modifier (`px-0!`). Zeroing the card's padding is the only override on this page.
- **Handle all three states.** Loading, error with a retry, and not-found are part of the page. A supplementary query — a rollup, a cross-record aggregate — degrades its own card and must not take the page down with it.

## Anti-patterns

- A "Back to …" row in the `ActionPanel`, or any back affordance in the screen's top-right — the breadcrumb owns navigation, top left.
- A rail that empties in a terminal state with nothing explaining why — or one kept alive by navigation entries so it doesn't look empty.
- A control on a derived status axis — a select or a "mark received" button over a value another module owns.
- A field the schema can't answer, invented to fill the summary's grid.
- A `Table.Footer` total over quantities in mixed units, or a currency symbol on a record with no currency — fabrication that reads as polish.
- Padding on a table container inside a card (`containerClassName="px-6"`) — double-pads the first column.
- `type: "date"` on a date-only string — renders a day early in negative-offset timezones.
- Splitting a record's own sections across tab panels, or putting the rail beside tabs so its actions appear to apply to the open panel.
- A card for a single parent document — one parent is a linked field, which says it more clearly.
- Hiding a child-document card once the relationship is possible — an empty card with a named empty state is information; a missing card isn't.
- Collapsing several status axes into one field, or rendering all of them as loud filled badges.
- A pre-computed disabled state over a refusal the server owns — a dead button with no sentence.
- A dialog stricter than the command behind it, blocking the path the server would have accepted.
- A `DataTable` for a dozen already-fetched line items.
- Load-bearing content in the right column, which becomes a footer on a narrow screen.
- An extension seam, internal identifier, or "see docs/…" pointer visible to an end user.
