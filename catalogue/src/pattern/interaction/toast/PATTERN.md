---
slug: pattern/interaction/toast
name: Toast
category: pattern
subcategory: interaction
description: Lightweight feedback after mutations — success or error notifications
requiredImports: [Button]
tags: [toast, feedback, notification, mutation, success, error]
do:
  - Feedback after a mutation (create, update, delete) — success or error
  - Lightweight async signal that doesn't need to block the UI
  - Confirming work the user just initiated
dont:
  - Destructive action that has not yet executed — use interaction/confirm
  - Long-running blocking operation — use an inline progress UI, not a toast
---

# pattern/interaction/toast

## When to Use

- Feedback after a mutation (create, update, delete) — success or error
- Lightweight async signal that doesn't need to block the UI
- Confirming work the user just initiated

## Page Implementation

<!-- source: toast-example.tsx -->

## Copy Rules

- Success: name what happened, including the object identifier. "Order #1234 created", "Product archived".
- Error: state what failed and why. "Failed to save: SKU already exists", "Couldn't archive product: network error".
- Avoid generic messages like "Success" or "Something went wrong".

## Constraints

- Toast renders as a top-right overlay; mobile (<1024) anchors to bottom-center
- Stack max one visible at a time; replace prior toast on new emission
- Success auto-dismisses after 3s; Error is sticky (no auto-dismiss)

## Anti-patterns

- Toast on every navigation — creates noise; reserve for mutation feedback
- More than one toast stacking — replace, don't accumulate
- Blocking the UI on a toast — toasts are non-modal by definition
