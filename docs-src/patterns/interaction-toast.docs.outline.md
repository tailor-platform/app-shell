---
kind: prose
slug: pattern/interaction/toast
name: Toast
group: interaction-toast
title: Toast
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

<!-- example: interaction-toast -->

<!-- source: toast-example.tsx -->

## Copy Rules

- Success: name what happened, including the object identifier. "Order #1234 created", "Product archived".
- Error: state what failed and why. "Failed to save: SKU already exists", "Couldn't archive product: network error".
- Avoid generic messages like "Success" or "Something went wrong".

## Constraints

- Toasts render at the bottom right. At 600px and below they span the bottom of the viewport
- Up to three stay visible; older ones collapse behind the newest and leave as new ones arrive
- Success, info and plain toasts close by themselves after 4s
- Error toasts, and any toast with an `action`, stay until the user closes them and show a close button. `useToast` sets this; a `duration` or `closeButton` passed to the call wins
- Never make a toast the only way to do something. If a toast offers Undo, the page offers a way back too. While a dialog or sheet is open, the keyboard reaches a toast only through sonner's hotkey (Alt+T)

## Anti-patterns

- Toast on every navigation — creates noise; reserve for mutation feedback
- One toast per item in a bulk operation — one toast that sums up the result
- An Undo or Retry that exists only in the toast — the page needs the same way back
- Blocking the UI on a toast — toasts are non-modal by definition
