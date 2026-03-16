---
name: add-component
description: "Guides creating new UI components for the AppShell core package. Use when: adding a new component, wrapping a Base UI primitive, creating a compound component, exporting a component from packages/core."
---

# Add Component

Follow this procedure when adding a new UI component to `packages/core/src/components/`.

## Step 1: Determine the Component Pattern

Choose one of the three patterns based on complexity:

### Pattern A — Simple Single-File Component

Use for standalone components with variant-based styling (e.g., Button, Badge, Input, Skeleton).

**File:** `packages/core/src/components/{component-name}.tsx`

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva("astw:base-classes", {
  variants: {
    variant: { default: "astw:..." },
    size: { default: "astw:..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});

type ComponentProps = React.ComponentProps<"div"> &
  VariantProps<typeof componentVariants>;

function Component({ className, variant, size, ...props }: ComponentProps) {
  return (
    <div
      data-slot="component"
      className={cn(componentVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Component, componentVariants, type ComponentProps };
```

### Pattern B — Compound Component (Namespace Object)

Use for multi-part components wrapping Base UI (e.g., Dialog, Sheet, Tooltip, Collapsible, Table).

**File:** `packages/core/src/components/{component-name}.tsx`

```tsx
import * as React from "react";
import { ComponentName as BaseComponentName } from "@base-ui/react/component-name";
import { cn } from "@/lib/utils";

// Pick only stable, consumer-relevant props — prevents upstream breakage
type RootProps = Pick<
  React.ComponentProps<typeof BaseComponentName.Root>,
  "open" | "defaultOpen" | "onOpenChange"
> & { children: React.ReactNode };

function Root({ children, ...props }: RootProps) {
  return (
    <BaseComponentName.Root data-slot="component-name" {...props}>
      {children}
    </BaseComponentName.Root>
  );
}
Root.displayName = "ComponentName.Root";

function Content({ className, children, ...props }: React.ComponentProps<typeof BaseComponentName.Content>) {
  return (
    <BaseComponentName.Content
      data-slot="component-name-content"
      className={cn("astw:...", className)}
      {...props}
    >
      {children}
    </BaseComponentName.Content>
  );
}
Content.displayName = "ComponentName.Content";

// Assemble all sub-components into a single namespace object
export const ComponentName = {
  Root,
  Content,
};
```

### Pattern C — Multi-File Component (Directory)

Use for complex components with many internal types, helpers, or renderers (e.g., DescriptionCard, ActionPanel).

```
components/
  component-name/
    ComponentName.tsx     # Main component logic
    types.ts              # Internal types, enums, field configs
    index.ts              # Minimal public exports
```

**index.ts:**
```tsx
export { ComponentName, default } from "./ComponentName";
export type { ComponentNameProps } from "./types";
// DO NOT export internal types, type guards, or enums
```

## Step 2: Styling Rules

All Tailwind classes MUST use the `astw:` prefix. This is a Tailwind v4 scoped prefix for AppShell.

- **DO:** `"astw:flex astw:items-center astw:gap-2"`
- **DON'T:** `"flex items-center gap-2"` (missing prefix)

Additional rules:

- Use `cn()` from `@/lib/utils` to merge class names
- Use `data-slot="component-name"` attribute on root elements for CSS scoping
- No `<style>` tags, `dangerouslySetInnerHTML`, or CSS-in-JS — use Tailwind utilities for better tooling support, type safety, and smaller bundle size
- No `"use client"` directive unless absolutely necessary — components must be framework agnostic (Next.js, Vite, Remix, etc.)
- No additions to `globals.css` for component-specific styles — components should be self-contained and portable
- No `@source` directives required — Tailwind automatically scans component files; users shouldn't need to manually configure CSS scanning

### Container Queries

Use Tailwind's container query utilities with arbitrary values:

```tsx
const gridClasses = cn(
  "astw:grid astw:gap-x-6 astw:gap-y-4",
  "astw:grid-cols-1",
  columns === 4
    ? "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3 astw:@[800px]:grid-cols-4"
    : "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3",
);

return (
  <div className="astw:@container">
    <div className={gridClasses}>{/* content */}</div>
  </div>
);
```

Do NOT write custom CSS with `@container` rules or use inline styles for container queries.

### Anti-Pattern: CSS Injection

```tsx
// BAD — never do this
const STYLES = `
  .custom-container { container-type: inline-size; }
  @container (min-width: 400px) {
    .custom-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

return (
  <>
    <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    <div className="custom-container">{/* content */}</div>
  </>
);
```

## Step 3: Base UI Integration

### Base UI Reference

When wrapping a Base UI component, fetch https://base-ui.com/llms.txt to find the relevant component or utility documentation URL, then fetch that URL to understand the full API before deciding which sub-components and props to expose via `Pick<>`.

### Wrapping Rules

When wrapping Base UI components:

- Use `Pick<>` to select only stable, consumer-relevant props from Base UI types
- Do NOT spread all Base UI props — this prevents upstream changes from becoming breaking changes
- Set `displayName` on every sub-component (e.g., `Root.displayName = "Dialog.Root"`)
- For components needing portals, use the Base UI `Portal` component

When using Base UI's `useRender` hook (for polymorphic rendering):

```tsx
import { useRender } from "@base-ui/react/use-render";

function Component({ render, children, ...props }: ComponentProps) {
  return useRender({
    defaultTagName: "button",
    render,
    props: { "data-slot": "component", children, ...props },
  });
}
```

## Step 4: Public API Export

Add the export to `packages/core/src/index.ts`:

```tsx
// Simple component — export component, variants, and Props type
export { Component, componentVariants, type ComponentProps } from "./components/component-name";

// Compound component (namespace object) — export only the namespace
export { ComponentName } from "./components/component-name";

// Directory component — export component and Props type only
export { ComponentName, type ComponentNameProps } from "./components/component-name";
```

**Minimal surface rules:**
- Export only the component and its primary Props type — smaller API surface reduces potential conflicts with future APIs and makes the library easier to maintain
- Do NOT export internal helper types, type guards, or enums (e.g., FieldConfig, FieldDefinition, FieldType, EmptyBehavior, FieldMeta)
- Do NOT export type guards for internal discriminated unions — consumers can use simple checks like `field.type === "divider"`
- Consumers can infer nested types via TypeScript utilities: `type Field = ComponentProps["fields"][number]`

## Step 5: Tests

Create a test file next to the component: `{component-name}.test.tsx`

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentName } from "./component-name";

afterEach(() => {
  cleanup();
});

describe("ComponentName", () => {
  // Snapshot tests for each variant/state
  describe("snapshots", () => {
    it("default", () => {
      const { container } = render(<ComponentName>Content</ComponentName>);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // Behavioral tests
  it("renders correctly", () => {
    render(<ComponentName>Content</ComponentName>);
    expect(screen.getByText("Content")).toBeDefined();
  });
});
```

**Testing conventions:**
- Use `vitest`, `@testing-library/react`, and `@testing-library/user-event`
- Include snapshot tests for all visual variants/states
- Include behavioral tests for interactions (click, hover, open/close)
- Snapshots are stored in `packages/core/__snapshots__/`
- For components requiring React Router, wrap with `<MemoryRouter>`

## Step 6: Verify

Run the quality-check skill (or manually run):

```bash
pnpm type-check && pnpm lint && pnpm test && pnpm fmt
```

## Checklist

Before considering the component complete, verify:

- [ ] All Tailwind classes use `astw:` prefix
- [ ] `data-slot` attribute set on root element(s)
- [ ] Base UI props use `Pick<>` (not spread all props)
- [ ] Sub-components have `displayName` (compound pattern)
- [ ] Export added to `packages/core/src/index.ts` (minimal surface)
- [ ] No internal types exported from public API
- [ ] Test file created with snapshots and behavioral tests
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm fmt` all pass
