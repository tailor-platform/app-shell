---
slug: pattern/form/wizard
name: Wizard Form
category: pattern
subcategory: form
description: Multi-stage create flow with 3-7 steps and per-step validation gates
requiredImports: [Layout, Card, Form, Fieldset, Field, Input, Select, Badge, Button]
tags: [form, wizard, multi-step, import, stepper]
do:
  - Multi-stage Create with 3-7 steps
  - Import flows (upload → map → validate → confirm)
  - Per-step validation gates progression
dont:
  - Single screen of fields — use form/modal or form/single-page
  - More than 7 steps — split into separate routed pages or reduce scope
---

# pattern/form/wizard

## When to Use

- Multi-stage Create with 3–7 steps
- Import flows (upload → map → validate → confirm)
- Per-step validation gates progression

## Page Implementation

<!-- source: wizard-form.tsx -->

## Constraints

- Max 7 steps — more than that causes user abandonment
- Back-navigation must preserve prior step's input
- Validation must be per-step — don't defer until final submit
- Step indicator collapses to "Step 2 of 4" label below 1024px

## Anti-patterns

- More than 7 steps — users lose context and abandon
- No back-navigation preservation — pressing Back loses prior step's input
- Validation deferred until final submit — failures force full re-traversal
