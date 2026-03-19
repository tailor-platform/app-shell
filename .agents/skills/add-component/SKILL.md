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

type ComponentProps = React.ComponentProps<"div"> & VariantProps<typeof componentVariants>;

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

function Content({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseComponentName.Content>) {
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

### Pattern D — Standalone (Pre-assembled + Parts)

Use when a compound component (Pattern B) has many sub-components that make typical usage verbose. The standalone pattern provides a **pre-assembled component** that covers 80% of use cases with a simple `items` prop, while still exposing low-level **Parts** for custom composition.

Pattern D can be combined with Pattern C (directory split) when the standalone or parts files grow large enough to warrant separate internal types or helper files.

**When to choose Pattern D over Pattern B:**

- Pattern B (Compound): The consumer always needs to choose and arrange sub-components (e.g., `Menu`, `Dialog` — content varies per usage)
- Pattern D (Standalone): There is a dominant usage pattern where passing `items` is sufficient, but some consumers need full control (e.g., `Select`, `Combobox`)

**Files:**

```
components/
  component-name.tsx              # Internal: Base UI wrappers (Parts primitives)
  component-name-standalone.tsx   # Public: Standalone + Parts re-export
```

**component-name.tsx** — Internal compound parts (Pattern B style, not exported from `index.ts`):

```tsx
import * as React from "react";
import { ComponentName as BaseComponentName } from "@base-ui/react/component-name";
import { cn } from "@/lib/utils";

function ComponentNameRoot<Value>({
  ...props
}: React.ComponentProps<typeof BaseComponentName.Root<Value>>) {
  return <BaseComponentName.Root data-slot="component-name" {...props} />;
}

function ComponentNameItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseComponentName.Item>) {
  return (
    <BaseComponentName.Item
      data-slot="component-name-item"
      className={cn("astw:...", className)}
      {...props}
    />
  );
}

// Assemble into Parts object
const ComponentNameParts = {
  Root: ComponentNameRoot,
  Item: ComponentNameItem,
  // ...other sub-components
};

export { ComponentNameRoot, ComponentNameItem, ComponentNameParts };
```

**component-name-standalone.tsx** — Public standalone + Parts:

```tsx
import { ComponentNameRoot, ComponentNameItem, ComponentNameParts } from "./component-name";
import type { MappedItem } from "./select-standalone"; // shared type if applicable

interface ComponentNameStandaloneProps<I> {
  items: I[];
  placeholder?: string;
  mapItem?: (item: ExtractItem<I>) => MappedItem;
  className?: string;
  value?: ExtractItem<I> | null;
  onValueChange?: (value: ExtractItem<I> | null) => void;
}

function ComponentNameStandalone<I>(props: ComponentNameStandaloneProps<I>) {
  // Pre-assembled composition using internal parts
  return (
    <div className={className}>
      <ComponentNameRoot items={items} value={value} onValueChange={onValueChange}>
        {/* pre-wired sub-components */}
      </ComponentNameRoot>
    </div>
  );
}

// Use Object.assign to keep the standalone callable as a component
// while attaching Parts and variant sub-components
const ComponentName = Object.assign(ComponentNameStandalone, {
  Parts: ComponentNameParts,
  // Optional variant sub-components (e.g., Async, Creatable)
});

export { ComponentName };
```

**Consumer usage:**

```tsx
// Standalone — simple usage (80% case)
<ComponentName items={["A", "B", "C"]} onValueChange={handleChange} />

// Parts — full control for custom layouts
<ComponentName.Parts.Root>
  <ComponentName.Parts.Trigger>...</ComponentName.Parts.Trigger>
  <ComponentName.Parts.Content>
    <ComponentName.Parts.Item value="a">Alpha</ComponentName.Parts.Item>
  </ComponentName.Parts.Content>
</ComponentName.Parts.Root>
```

**Conventions:**

- The standalone file (`-standalone.tsx`) is the public entry point exported from `index.ts`
- The internal parts file (without `-standalone`) is NOT exported from `index.ts`
- Use `Object.assign` to attach `Parts` and variant sub-components (e.g., `Async`, `Creatable`) to the standalone function
- Variant sub-components should support the same `mapItem`, `className`, `disabled` base props as the standalone

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

- **Root / Provider components**: Use `Pick<>` to select only stable, consumer-relevant props from Base UI types. Root components often expose internal state-management props that should not leak to consumers, so explicitly pick `open`, `defaultOpen`, `onOpenChange`, `children`, etc.
- **Leaf sub-components** (Trigger, Content, Item, etc.): Use `React.ComponentProps<typeof Base*.SubComponent>` directly. These components have a narrow, stable prop surface (mostly `className`, `children`, DOM attributes) and benefit from automatic compatibility with Base UI updates.
- **Composited Leaf sub-components** (wrapping multiple Base UI primitives, e.g. Portal + Positioner + Popup): When a single wrapper component combines props from multiple Base UI primitives, group each primitive's props under a namespaced prop object to prevent name collisions between primitives and keep prop ownership clear. The primary primitive's props (typically the one rendered as the outermost DOM element) stay at the top level; secondary primitives get a nested prop.

```tsx
// Example: Content wraps both Positioner and Popup.
// Popup props stay top-level (it's the primary element consumers style).
// Positioner props are grouped under `position`.
function Content({
  className,
  position,
  children,
  ...popupProps
}: React.ComponentProps<typeof Base*.Popup> & {
  position?: { side?: "top" | "right" | "bottom" | "left"; align?: "start" | "center" | "end"; sideOffset?: number };
}) {
  const { side = "bottom", align = "start", sideOffset = 4 } = position ?? {};
  return (
    <Base*.Portal>
      <Base*.Positioner sideOffset={sideOffset} side={side} align={align}>
        <Base*.Popup className={cn("astw:...", className)} {...popupProps}>
          {children}
        </Base*.Popup>
      </Base*.Positioner>
    </Base*.Portal>
  );
}
```

If the same nested shape is reused across multiple components, extract a shared internal type (e.g. `PositionProps` in `@/lib/position`) — but the principle itself is general: **always use prop hierarchy to separate concerns when compositing multiple primitives**.

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
