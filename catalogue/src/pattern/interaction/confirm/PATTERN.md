---
slug: pattern/interaction/confirm
name: Confirm
category: pattern
subcategory: interaction
description: Confirmation dialog before destructive or irreversible actions
requiredImports: [Dialog, Button, Input]
tags: [dialog, confirm, destructive, delete, irreversible]
do:
  - Before a destructive or irreversible action (delete, cancel, void, archive)
  - Before bulk actions that affect many records
  - When the action's consequence isn't obvious from the trigger
dont:
  - Routine reversible actions — use interaction/toast with optional Undo instead
  - Form submission for non-destructive create/edit — submit handlers don't need a confirm
---

# pattern/interaction/confirm

## When to Use

- Before a destructive or irreversible action (delete, cancel, void, archive)
- Before bulk actions that affect many records
- When the action's consequence isn't obvious from the trigger

## Page Implementation

<!-- source: confirm.tsx -->

## Copy Rules

- Title is a question, names the object: "Delete order ORD-1234?", "Cancel invoice INV-001?"
- Body names the object and the consequence: what will change, what will be lost, whether it's reversible
- Confirm button verb matches the title: "Delete", "Cancel invoice" — never "OK" or "Yes"

## Constraints

- Dialog renders as bottom sheet below 1024px; centered max-w-sm at 1024+
- Confirm button must use `variant="destructive"` for destructive actions

## Anti-patterns

- Vague titles like "Are you sure?" — gives users nothing to evaluate
- Cancel rendered as the primary visual treatment — promotes the wrong default
- Confirm button without `variant="destructive"` for destructive actions — no visual signal
