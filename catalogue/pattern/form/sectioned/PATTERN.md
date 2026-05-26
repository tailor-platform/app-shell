---
slug: pattern/form/sectioned
name: Sectioned Form
category: pattern
subcategory: form
description: Complex form with 15+ fields organized into named fieldset sections
requiredImports: [Layout, Form, Fieldset, Field, Input, Select, Combobox, Button]
tags: [form, sections, fieldset, settings, complex]
do:
  - Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
  - Configure-style settings pages with named boundaries
dont:
  - Simple Create/Edit — use form/modal (the default)
  - Routed Create/Edit at moderate size with no grouping — use form/single-page
  - Step-gated validation across stages — use form/wizard
---

# pattern/form/sectioned

## When to Use

- Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
- Configure-style settings pages with named boundaries

## Page Implementation

<!-- source: sectioned-form.tsx -->

## Constraints

- Max ~6 sections — more than that is too hard to scan; promote to `form/wizard`
- Required-marker convention must be consistent across all sections
- Section legends must match anchor-nav labels

## Anti-patterns

- More than ~6 sections — hard to scan; promote to `form/wizard`
- Required-marker convention varies between sections — pick one rule and apply everywhere
- Section legends that don't match anchor-nav labels
