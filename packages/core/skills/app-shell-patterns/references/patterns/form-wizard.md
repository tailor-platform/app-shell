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

```tsx
/* pattern: form/wizard */
import { useState } from "react";
import { Button, Card, Layout, Badge, Input, Field } from "@tailor-platform/app-shell";

const STEPS = ["Upload", "Map", "Review", "Done"] as const;

type Props = {
  onComplete: () => void;
};

export default function WizardForm({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Layout>
      <Layout.Header title="Import products" />
      <Layout.Column>
        <Card.Root>
          <Card.Content>
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <Badge
                  key={step}
                  variant={i === currentStep ? "default" : i < currentStep ? "success" : "neutral"}
                >
                  {i + 1}. {step}
                </Badge>
              ))}
            </div>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Content>
            {currentStep === 0 && (
              <div className="space-y-4">
                <Field.Root name="file">
                  <Field.Label>CSV file</Field.Label>
                  <Field.Control render={<Input type="file" accept=".csv" />} />
                </Field.Root>
              </div>
            )}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-fg-muted">Map CSV columns to product fields</p>
                <Field.Root name="nameColumn">
                  <Field.Label>Name column</Field.Label>
                  <Field.Control render={<Input placeholder="e.g. Column A" />} />
                </Field.Root>
                <Field.Root name="skuColumn">
                  <Field.Label>SKU column</Field.Label>
                  <Field.Control render={<Input placeholder="e.g. Column B" />} />
                </Field.Root>
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-fg-muted">Review your import — 42 products will be created.</p>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-fg-default">Import complete! 42 products created.</p>
              </div>
            )}
          </Card.Content>
        </Card.Root>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <Button onClick={handleNext}>{currentStep === STEPS.length - 1 ? "Done" : "Next"}</Button>
        </div>
      </Layout.Column>
    </Layout>
  );
}
```

## Constraints

- Max 7 steps — more than that causes user abandonment
- Back-navigation must preserve prior step's input
- Validation must be per-step — don't defer until final submit
- Step indicator collapses to "Step 2 of 4" label below 1024px

## Anti-patterns

- More than 7 steps — users lose context and abandon
- No back-navigation preservation — pressing Back loses prior step's input
- Validation deferred until final submit — failures force full re-traversal
