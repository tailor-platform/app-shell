---
slug: pattern/form/modal
name: Modal Form
title: Modal Form
group: form-modal
category: pattern
subcategory: form
description: Default form pattern for Create/Edit — keeps user in context on the parent screen
requiredImports: [Dialog, Button, Form, Field, Input]
tags: [form, modal, dialog, create, edit, inline-add]
do:
  - Default for most Create and Edit forms — keeps user in context on parent screen
  - Inline add of a related entity from another screen (add address from order detail)
  - Quick configuration changes and single-purpose forms (rename, change status)
  - Any form the design hasn't explicitly called out as a full-page routed screen
dont:
  - Design explicitly calls for a full-page (non-overlay) routed Create or Edit
  - Form is complex with 15+ fields or multiple grouped sections — use form/sectioned
  - Multi-stage flow with per-step validation — use form/wizard
---

# pattern/form/modal

## When to Use

- Default for most Create and Edit forms — keeps user in context on parent screen
- Inline add of a related entity from another screen (add address from order detail)
- Quick configuration changes and single-purpose forms (rename, change status)
- Any form the design hasn't explicitly called out as a full-page routed screen

## Page Implementation

<!-- example: modal-form -->

## Route-driven Variant

The route-driven variant renders the same component at both the parent path and the `create` / `edit` path, with `onOpenChange` navigating back so the URL stays in sync.

## Constraints

- Dialog renders full-screen sheet below 1024px; centered max-w-md at 1024–1280px
- Route-driven variant requires both parent path and create/edit path to render the same component
- `onOpenChange` must navigate back — just calling `setOpen(false)` leaves the URL broken

## Anti-patterns

- Nesting modals — opening a Dialog from inside another Dialog
- Modal containing a wizard — promote to a routed `form/wizard`
- Save closes the dialog but parent state is stale — wire refetch or optimistic update
- Building a routed Create/Edit page when the design didn't explicitly call for one — modal is the default
- Registering the create path as a separate top-level route — that unmounts the parent list
