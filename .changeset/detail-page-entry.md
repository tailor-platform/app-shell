---
"@tailor-platform/app-shell": patch
---

Promote the detail-screen guidance in the bundled `app-shell-patterns` skill from a pattern to a page, rebuild it around how three real implementations structure these screens, and fix two pieces of composition advice that were wrong.

`detail/hero-with-actions` moves out of `src/pattern/` to become `page/detail`, the first entry in the `page` category. A detail screen is the shape of a whole route rather than one recipe used inside one, so it belongs at the page layer where an agent meets it before choosing anything else.

The main column is now a fixed card order that a record skips into but never reorders: terminal-state alerts, the summary, upstream sources and blocks, line items, downstream documents and the journal. The rail is actions, then external-system context, then history.

Points worth calling out:

- **Card or field is decided by cardinality, not direction.** A to-one relationship is a link field on the summary; a to-many one — or one the API can't traverse — earns a card. A record with several upstream sources gets an upstream card, above the lines.
- **Every status axis gets its own badge, and derived axes get no control.** A lifecycle status is filled, progress statuses are `outline-*`, and a select or "mark received" button over a value another module owns claims an ownership the screen doesn't have.
- **A total row is a claim.** `Table.Footer` only where the column genuinely sums — quantities in mixed units don't, and a currency symbol on a record with no currency reads as fabrication.
- **Only fields the schema can answer.** Deriving one from loaded data is fine; inventing one is how a page ships broken.
- **No back button in the rail, or anywhere in a screen's top-right.** Navigation is not an action on the record, and the top-right is not where anyone looks to go back — that is the breadcrumb's job, top left. In a terminal state the rail is omitted entirely rather than padded with navigation to avoid looking empty.
- **No pre-computed disabled state over a refusal the server owns**, and no confirm dialog stricter than the command behind it.
- **One scrolling column, with a single specified exception for tabs.** A second tab is earned only when the record posted a separate accounting or inventory record — a stock movement or a GL entry — and that record is the tab's subject. Column length, card count and "a details tab and an activity tab" are all explicitly not grounds for one.

Consumer-facing examples use plain, unprefixed Tailwind classes, per the measured rule on tailor-inc/platform-planning#1651: a real prop where one exists, a plain utility to add a property AppShell doesn't set, and the `!` importance modifier to override one it does. `astw:` stays where it belongs — on AppShell's own internal classes.

The entry takes a firm position on **editing**: prefer editing in place. Where a field is editable in the record's current state, it swaps to an input where it already sits, so someone learns one screen position per field rather than two and the page doesn't rearrange itself around the act of editing. A dialog is for a group that must validate together; a sub-route only for a whole-record edit. Both client apps reviewed already work this way. A **reference documents** card covers attachments, and a note on **width** records that AppShell imposes no maximum — apps must cap the content width themselves, which is a gap rather than a decision.

It also documents a `DescriptionCard` layout trap: fields lay out as a grid in DOM order, so dropping an empty field shifts every field after it into the vacated slot, and two records of the same type then present the same information in different positions. Default to the em dash; remove a field only where its absence is itself meaningful; and group conditional fields at the end of their section, since `{ type: "divider" }` starts a new grid and bounds the shift.

On **line items**, the entry no longer claims they are always few and fully fetched. That is how every reviewed implementation renders its read-only screens — a plain `Table` over lines fetched with the record — but the bound comes from a `lines(first: 1000)` query cap, and that cap has already caused a silent-deletion bug in one client app, which now pages its edit forms at 100. The guidance is: plain table by default, page where a document type can exceed a page, and never let a query cap stand in for pagination. Columns drawn from related records — received and billed on an order line, ordered and remaining on a receipt line — are documented as depending on where the record sits in its document chain, not as a fixed part of the table. A shared line-items component is flagged as wanted; nothing in AppShell yet covers reading and editing lines with paging in one place.

Two conventions that were implicit are now written down. **Links**: `text-primary` at rest, underline only on hover, app-shell's `Link` for internal routes, and `<a target="_blank" rel="noopener noreferrer">` plus a lucide `ExternalLink` for external ones — the treatment `DescriptionCard` already applies and two client apps independently converged on, added as `design-system.md` §4b. **Rail icons**: one lucide glyph per verb (`Pencil` edit, `FileEdit` amend, `Copy` duplicate, `Send` submit/post, `Check` approve, `Ban` reject, `XCircle` cancel/close, `PackagePlus` create receipt, `History` revisions, …), drawn from the icons a client codebase actually ships so the rail reads the same on every document.

Two corrections to `fundamental/components.md`, both verified against the built stylesheet and a rendered page rather than inferred:

- **A table inside a card needs one geometry change, not two.** The docs said to zero `Card.Content`'s padding _and_ pass `containerClassName="astw:px-6"` on `Table.Root`, claiming the cell's intrinsic `first:pl-6` "does NOT render reliably". It does — `.astw\:first\:pl-6:first-child` is in the shipped CSS — so the container's padding stacks on top of it and pushes the first column 24px right of the card title. The recipe, the two canonical examples and the DON'T example were all inverted.
- **`ActionPanel`'s `actions` was documented as `{ label, onSelect, variant?, disabled?, hidden? }`.** The real row requires `key`, `label` and `icon`, the handler is `onClick`, and there is no `hidden` — the documented example could not compile. The row type isn't exported separately, so an actions array annotates as `ActionPanelProps["actions"]`.

Also recorded: `DescriptionCard`'s `type: "date"` parses a date-only `"YYYY-MM-DD"` string with `new Date(...)`, i.e. as UTC midnight, so it renders the previous day in negative-offset timezones. Date-only fields should be pre-formatted through `render`; real timestamps keep `type: "date"`.
