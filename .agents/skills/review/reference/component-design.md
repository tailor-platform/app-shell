# Component Design Review Criteria

Treat this file as the main component-design reference for AppShell.

Use it for both:

- **review criteria** for component/API design
- **authoring reference** for the intended patterns and code examples

## Public API should stay narrow

Review for a small, stable public surface.

Prefer:

- exporting the component and its primary props type
- keeping helper types, type guards, enums, and implementation details internal
- designing around the current need instead of speculative extension points

Be skeptical of:

- public hooks or escape hatches with only one concrete use case
- leaking upstream library internals into AppShell public APIs
- adding parallel ways to express the same concept without a clear reason

### Good export shape examples

```tsx
// Simple component
export { Button, buttonVariants, type ButtonProps } from "./components/button";

// Directory component
export { DescriptionCard, type DescriptionCardProps } from "./components/description-card";

// Compound component
export { Dialog } from "./components/dialog";
```

### Minimal-surface rules

- component + primary props type is usually enough
- compound exports should remain understandable to consumers
- `Object.assign`-based callable exports should not destabilize consumer typing
- internal files should not become public accidentally through convenience re-exports
- do not export internal helper types, type guards, or enums by convenience

## Consumer-facing entrypoints

Review whether the shipped contract stays stable and understandable for consumers:

- `packages/*/src/index.ts`, package `exports`, and style entrypoints should not drift silently
- CSS entrypoints, compatibility shims, and import paths consumers rely on should stay intentional
- consumers should not need repo-only imports or example-only setup for the component to work as documented
- JS entrypoints should not pick up CSS side effects unless that contract is explicit
- docs, examples, exports, and implementation should tell the same import story

---

## Pattern fit

Review whether the chosen pattern matches the actual component shape.

Be skeptical when a heavier pattern adds public surface without reducing real complexity.

### Pattern A — Simple single-file component

Use when the component is mostly a styled element with variants and a small prop surface.

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

### Pattern B — Compound namespace object

Use when the consumer must compose meaningful sub-components directly.

```tsx
import * as React from "react";
import { ComponentName as BaseComponentName } from "@base-ui/react/component-name";
import { cn } from "@/lib/utils";

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

const ComponentName = {
  Root,
  Content,
};

export { ComponentName };
```

### Pattern C — Directory component

Use when the implementation needs multiple internal files, but the public API should still stay small.

```text
components/
  component-name/
    ComponentName.tsx
    types.ts
    index.ts
```

```tsx
// index.ts
export { ComponentName, default } from "./ComponentName";
export type { ComponentNameProps } from "./types";
// DO NOT export internal types, type guards, or enums
```

### Pattern D — Standalone + `Parts`

Use when there is a dominant pre-assembled use case, but advanced consumers still need composition escape hatches.

**Internal parts file**

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

const ComponentNameParts = {
  Root: ComponentNameRoot,
  Item: ComponentNameItem,
};

export { ComponentNameRoot, ComponentNameItem, ComponentNameParts };
```

**Standalone public entry**

```tsx
import { ComponentNameRoot, ComponentNameParts } from "./component-name";
import type { MappedItem } from "./select-standalone";

interface ComponentNameStandaloneProps<I> {
  items: I[];
  placeholder?: string;
  mapItem?: (item: ExtractItem<I>) => MappedItem;
  className?: string;
  value?: ExtractItem<I> | null;
  onValueChange?: (value: ExtractItem<I> | null) => void;
}

function ComponentNameStandalone<I>({
  className,
  items,
  value,
  onValueChange,
}: ComponentNameStandaloneProps<I>) {
  return (
    <div className={className}>
      <ComponentNameRoot items={items} value={value} onValueChange={onValueChange}>
        {/* pre-wired sub-components */}
      </ComponentNameRoot>
    </div>
  );
}

const ComponentName = Object.assign(ComponentNameStandalone, {
  Parts: ComponentNameParts,
  // Optional variant sub-components (for example Async, Creatable)
});

export { ComponentName };
```

**Consumer usage**

```tsx
// Standalone — simple usage
<ComponentName items={["A", "B", "C"]} onValueChange={handleChange} />

// Parts — full control for custom layouts
<ComponentName.Parts.Root>
  <ComponentName.Parts.Trigger>...</ComponentName.Parts.Trigger>
  <ComponentName.Parts.Content>
    <ComponentName.Parts.Item value="a">Alpha</ComponentName.Parts.Item>
  </ComponentName.Parts.Content>
</ComponentName.Parts.Root>
```

---

## Base UI integration first

Prefer wrapping Base UI primitives before inventing new low-level interaction models.

Review for:

- Root wrappers exposing only stable, consumer-relevant props
- leaf wrappers staying close to the underlying primitive shape
- composited wrappers separating different primitive concerns instead of flattening everything into one prop bag
- wrapper code preserving Base UI behavior instead of accidentally fighting it

### Base UI reference

When wrapping a Base UI component, fetch `https://base-ui.com/llms.txt` to find the relevant component or utility documentation URL, then fetch that URL to understand the full API before deciding which sub-components and props to expose via `Pick<>`.

### Prop-shape guidance

- Root/provider components should expose a narrow, intentional prop subset.
- Leaf sub-components should usually preserve the underlying primitive's narrow prop shape.
- When one wrapper composes multiple primitives, keep prop ownership clear instead of merging unrelated concerns into one flat prop surface.

### Good wrapping examples

```tsx
// Root/provider: narrow, intentional prop surface

type RootProps = Pick<
  React.ComponentProps<typeof BaseDialog.Root>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  children: React.ReactNode;
};

function Root({ children, ...props }: RootProps) {
  return (
    <BaseDialog.Root data-slot="dialog" {...props}>
      {children}
    </BaseDialog.Root>
  );
}
```

```tsx
// Leaf wrapper: stay close to the primitive
function Trigger(props: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}
```

```tsx
// Composited wrapper: keep prop ownership clear
function Content({
  className,
  position,
  children,
  ...popupProps
}: React.ComponentProps<typeof BasePopover.Popup> & {
  position?: {
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
  };
}) {
  const { side = "bottom", align = "start", sideOffset = 4 } = position ?? {};

  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset}>
        <BasePopover.Popup className={cn("astw:...", className)} {...popupProps}>
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
```

### `useRender`

When using Base UI's `useRender` hook for polymorphic rendering:

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

---

## Popup, portal, and container ownership

For popup-like components or wrappers around them, review:

- default portal target and optional `container` ownership
- anchor and positioner ownership
- whether one wrapper change silently alters behavior for an entire component family
- layering inside real shell contexts such as dialogs, drawers, sticky UI, and scroll containers
- modal vs non-modal boundaries: backdrop, outside pointer events, scroll lock, and dismissal
- clipping, width, and position seams across nested or scrollable containers

---

## Form API consistency

Across form controls, review whether the API stays consistent around:

- `value`, `defaultValue`, `onValueChange`
- controlled vs uncontrolled ownership
- `disabled`, `required`, `readOnly`, `invalid`
- `Field.Root` composition
- nullability and empty-state meaning
- async and sync variant consistency

---

## Styling conventions

Review whether component styling remains self-contained and consistent:

- Tailwind classes use the `astw:` prefix
- `cn()` and `data-slot` conventions remain intact when relevant
- component-specific styling does not silently escape into global CSS without a clear reason
- avoid CSS injection or ad-hoc style hacks when utility classes or existing structure would do
- prefer framework-agnostic components unless client-only behavior is truly required

### Good / bad styling examples

```tsx
// Good
<div data-slot="component" className={cn("astw:flex astw:items-center", className)} />
```

```tsx
// Bad: missing prefix and injecting ad-hoc styles
<style dangerouslySetInnerHTML={{ __html: ".component { display: flex; }" }} />
<div className="component" />
```

### Container queries

Prefer Tailwind container-query utilities with arbitrary values.

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

Do not write custom CSS with `@container` rules or use inline styles for container queries.

### Anti-pattern: CSS injection

```tsx
// Bad — never do this
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

---

## Testing shape examples

Use tests that prove the risky behavior for the component change.

```tsx
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentName } from "./component-name";

afterEach(() => {
  cleanup();
});

describe("ComponentName", () => {
  describe("snapshots", () => {
    it("default", () => {
      const { container } = render(<ComponentName>Content</ComponentName>);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders correctly", () => {
    render(<ComponentName>Content</ComponentName>);
    expect(screen.getByText("Content")).toBeDefined();
  });
});
```

Testing conventions worth preserving:

- use `vitest`, `@testing-library/react`, and `@testing-library/user-event`
- include behavior tests for the interactions that actually carry risk
- include snapshots for meaningful visual or state combinations worth pinning
- snapshots live in `packages/core/__snapshots__/`
- for components requiring React Router, wrap with `<MemoryRouter>`
- when the public TypeScript API is the risky part, add type-shaped coverage too

---

## Review questions

- Is this component pattern the lightest one that still fits the real usage?
- Does the wrapper expose only what AppShell wants to own publicly?
- Is form behavior consistent with nearby components?
- Did a styling workaround silently widen the component contract?
- Are the examples, exports, and implementation shape all telling the same API story?
