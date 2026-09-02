---
slug: pattern/form/composer
name: Composer
category: pattern
subcategory: form
description: Free-text composer — a multi-line input above a trailing action row, for notes, replies, and comments submitted in place
requiredImports: [Card, Textarea, Button, Checkbox]
tags: [composer, textarea, note, reply, comment, actions, discard, send]
do:
  - A free-text box the user fills and submits in place — add a note, reply on a thread, leave a comment, give a rejection reason
  - The prose IS the interaction; any other controls only qualify how the text is submitted
dont:
  - The text is one field among many on a record form — use form/modal, form/single-page or form/sectioned with a Textarea field
  - A chat input where Enter sends and there is no Discard — that is a different layout
---

# pattern/form/composer

## When to Use

- A free-text box the user fills and submits in place — add a note, reply on a thread, leave a comment, give a rejection reason
- The prose IS the interaction; any other controls only qualify how the text is submitted

## Layout

```
+---------------------------------------------------------+
| Card.Root / Card.Content                                 |
|  +-----------------------------------------------------+ |
|  | Textarea                                            | |
|  |                                                     | |
|  +-----------------------------------------------------+ |
|  [ options slot … ]                  [Discard] [ Send ] |
+---------------------------------------------------------+
```

Two rows inside one `Card`:

1. **Body** — a single `Textarea`, sized with `rows`. Tall enough to read as "write here", short enough that the action row stays on screen.
2. **Action row** — one `flex items-center justify-between` line with a fixed right side and a free left side.

## The action row

This is the part the pattern actually fixes. Everything sits on **one line**, never stacked.

**Right side — fixed.** Reading left to right: an optional `variant="ghost"` **Discard**, then exactly **one** primary submit. Nothing else goes here.

- Discard clears the body; it does not close or navigate. Omit it when there is nothing to discard back to.
- The submit is the view's single primary `Button` — never a second filled button beside it.
- Both disable while `submitting`; the submit also disables on empty/whitespace-only input.
- Swap the submit's label for a pending label while in flight ("Send" → "Sending…"). Do not swap in a spinner-only button — the label is what tells the user what is happening.

**Left side — open.** Zero or more controls that qualify the submission, laid out `flex items-center gap-2` and allowed to shrink (`min-w-0`) so the buttons never get pushed off. Common occupants:

- a `Checkbox` toggle — visibility, "internal note", "notify watchers" (the worked example below)
- an attachment or template `Button` with `variant="ghost"`
- a small `Select` — reply-as, channel, canned response

Leave it empty and the buttons still sit correctly at the right; `justify-between` needs no placeholder element.

## Page Implementation

<!-- source: composer.tsx -->

## Constraints

- The body control is `Textarea`, never `Input` — `Input` is locked to `h-9` and clips prose to one 36px line.
- Size the body with `rows` (3–5 is the usual range). Don't reach for an `astw:h-*` / `astw:min-h-*` override: `astw:` utilities only resolve if that exact class was compiled into the AppShell package CSS, so an arbitrary one written in a consuming app silently does nothing.
- The `Textarea` needs an accessible name. There is usually no visible label in a composer, so pass `aria-label`; a placeholder is not a label.
- One primary `Button` in the action row. Discard is `ghost`, and any left-side action is `ghost` too.
- The action row is one row at every width — the left side shrinks, the buttons do not wrap under the body.
- Disable the submit on empty or whitespace-only input, and disable both buttons while `submitting`.
- Wrap the composer in `Card.Root` when it sits among other cards (a detail page, the end of a thread). A composer that is already inside a `Sheet` or `Dialog` body does not need its own card.

## Anti-patterns

- `Input` (or `Field.Control` with no override) for the body — a single-line box for multi-line text.
- Discard rendered as `outline` or filled — it competes with the submit for the eye.
- Submit and Discard both filled, or a third action added to the right side.
- The action row stacked above the `Textarea`, or the buttons wrapped onto their own line — the composer stops reading as one unit.
- A left-side toggle that silently changes what the submit does without changing the submit's own affordance — if "internal note" changes the destination, the placeholder (or the label) should say so.
- Submit enabled on an empty body, so the user can post nothing.
- A body so tall (`rows={12}`) that the action row falls below the fold — the composer stops reading as one unit.
