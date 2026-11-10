import * as React from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";

import { cn } from "@/lib/utils";
import { Card } from "../card";
import { Text } from "../text";
import type {
  FormColumns,
  FormLayoutActionsProps,
  FormLayoutItemProps,
  FormLayoutProps,
  FormLayoutSectionProps,
} from "./types";

// ============================================================================
// Grid classes
//
// Columns follow the width of the nearest `@container` (the FormLayout root,
// a section card, a Dialog body…), not the viewport, so the same field
// markup reflows inside a dialog, a sheet and a page. Thresholds match
// DescriptionCard (400px for two columns) and leave about 190px per field.
//
// Spans are applied from the grid side (`[&>[data-span=…]]`) because only the
// grid knows its column count: a `span={3}` field in a two-column grid must
// stop at two, or the browser adds an implicit third column.
//
// Class strings MUST stay literal so Tailwind's compiler emits them.
// ============================================================================

const COLUMN_CLASSES: Record<FormColumns, string> = {
  1: "astw:grid-cols-1",
  2: "astw:grid-cols-1 astw:@[400px]:grid-cols-2",
  3: "astw:grid-cols-1 astw:@[400px]:grid-cols-2 astw:@[640px]:grid-cols-3",
  4: "astw:grid-cols-1 astw:@[400px]:grid-cols-2 astw:@[640px]:grid-cols-3 astw:@[880px]:grid-cols-4",
};

const SPAN_TWO =
  "astw:@[400px]:[&>[data-span='2']]:col-span-2 astw:@[400px]:[&>[data-span='3']]:col-span-2";
const SPAN_THREE = "astw:@[640px]:[&>[data-span='3']]:col-span-3";

const SPAN_CLASSES: Record<FormColumns, string> = {
  1: "",
  2: SPAN_TWO,
  3: cn(SPAN_TWO, SPAN_THREE),
  4: cn(SPAN_TWO, SPAN_THREE),
};

function gridClasses(columns: FormColumns) {
  return cn(
    "astw:grid astw:gap-x-6 astw:gap-y-4 astw:[&>*]:min-w-0",
    // Field.Root aligns its children to the start; in a grid cell every
    // control should fill the column instead.
    "astw:[&>[data-slot=field]]:items-stretch",
    "astw:[&>[data-span=full]]:col-span-full",
    // Free text needs the whole row. A field holding a Textarea takes it
    // unless it sets its own `span`.
    "astw:[&>[data-slot=field]:has(textarea):not([data-span])]:col-span-full",
    COLUMN_CLASSES[columns],
    SPAN_CLASSES[columns],
  );
}

const FormLayoutContext = React.createContext<{ columns: FormColumns }>({ columns: 2 });

// ============================================================================
// FormLayout.Section
// ============================================================================

/**
 * FormLayout.Section — A titled group of fields with its own grid.
 *
 * Renders a `<fieldset>` whose legend holds the `title` as an `h3`, so
 * screen readers announce the group and list the section among the page's
 * headings. The `description` is the fieldset's accessible description.
 * Use `variant="card"` on pages and `variant="plain"` inside a Dialog or
 * Sheet, where a card inside the panel looks heavy.
 *
 * @example
 * ```tsx
 * <FormLayout.Section title="Delivery" description="Where and when goods arrive.">
 *   <Field.Root name="warehouse">…</Field.Root>
 *   <Field.Root name="expectedDate">…</Field.Root>
 *   <Field.Root name="instructions" span="full">…</Field.Root>
 * </FormLayout.Section>
 * ```
 */
function Section({
  title,
  description,
  action,
  columns,
  variant = "card",
  disabled,
  id,
  className,
  style,
  children,
}: FormLayoutSectionProps) {
  const inherited = React.useContext(FormLayoutContext);
  const effectiveColumns = columns ?? inherited.columns;
  const hasHeader = title != null || description != null || action != null;
  const descriptionId = React.useId();

  const body = (
    <BaseFieldset.Root
      disabled={disabled}
      aria-describedby={description != null ? descriptionId : undefined}
      className={cn(
        "astw:flex astw:min-w-0 astw:flex-col astw:gap-4",
        variant === "card" && "astw:p-6",
      )}
    >
      {hasHeader && (
        <div className="astw:flex astw:items-start astw:justify-between astw:gap-4">
          <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
            {/*
             * The legend names the fieldset; the heading inside it puts the
             * section in the page outline, so screen reader users can jump
             * between sections by heading.
             */}
            {title != null && (
              <BaseFieldset.Legend data-slot="form-layout-section-title">
                <Text.h3
                  variant="heading-md"
                  className="astw:leading-none astw:text-card-foreground"
                >
                  {title}
                </Text.h3>
              </BaseFieldset.Legend>
            )}
            {description != null && (
              <Text.p
                id={descriptionId}
                data-slot="form-layout-section-description"
                className="astw:text-muted-foreground"
              >
                {description}
              </Text.p>
            )}
          </div>
          {action != null && (
            <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-2">{action}</div>
          )}
        </div>
      )}
      <FormLayoutContext.Provider value={{ columns: effectiveColumns }}>
        <div data-slot="form-layout-grid" className={gridClasses(effectiveColumns)}>
          {children}
        </div>
      </FormLayoutContext.Provider>
    </BaseFieldset.Root>
  );

  if (variant === "plain") {
    return (
      <div
        id={id}
        data-slot="form-layout-section"
        data-variant="plain"
        data-span="full"
        // The divider only separates one plain section from the next, so
        // nothing draws above the first section, even when fields or a
        // FormLayout.Item come before it.
        className={cn(
          "astw:@container astw:border-border astw:[[data-slot=form-layout-section][data-variant=plain]+&]:border-t astw:[[data-slot=form-layout-section][data-variant=plain]+&]:pt-6",
          className,
        )}
        style={style}
      >
        {body}
      </div>
    );
  }

  return (
    <Card.Root
      id={id}
      data-slot="form-layout-section"
      data-variant="card"
      data-span="full"
      className={cn("astw:@container", className)}
      style={style}
    >
      {body}
    </Card.Root>
  );
}
Section.displayName = "FormLayout.Section";

// ============================================================================
// FormLayout.Item
// ============================================================================

/**
 * FormLayout.Item — Places non-field content (an Alert, a table, a custom
 * block) in the form grid. `Field.Root` and `Fieldset.Root` take `span`
 * themselves and need no wrapper.
 */
function Item({ span, className, style, children }: FormLayoutItemProps) {
  return (
    <div
      data-slot="form-layout-item"
      data-span={span}
      className={cn("astw:min-w-0", className)}
      style={style}
    >
      {children}
    </div>
  );
}
Item.displayName = "FormLayout.Item";

// ============================================================================
// FormLayout.Actions
// ============================================================================

/**
 * FormLayout.Actions — The form's action bar, right-aligned and full width.
 *
 * On a page, Save usually lives in `Layout.Header` (via `form="<id>"`); add
 * a `sticky` action bar as well when the form is long enough to scroll.
 * Inside a Dialog or Sheet use `Dialog.Footer` / `Sheet.Footer` instead.
 */
function Actions({ sticky = false, start, className, style, children }: FormLayoutActionsProps) {
  return (
    <div
      data-slot="form-layout-actions"
      data-span="full"
      data-sticky={sticky ? "" : undefined}
      className={cn(
        "astw:flex astw:flex-wrap astw:items-center astw:justify-end astw:gap-x-4 astw:gap-y-2",
        // A floating card rather than a full-bleed strip: it doesn't depend on
        // matching the page background, which differs between shells and themes.
        sticky &&
          "astw:sticky astw:bottom-4 astw:z-10 astw:rounded-xl astw:border astw:border-border astw:bg-card astw:px-4 astw:py-3 astw:shadow-lg",
        className,
      )}
      style={style}
    >
      {/*
       * Buttons keep their natural width. When space runs out the start
       * content moves to its own line first; the buttons wrap (still
       * right-aligned) only if they don't fit side by side.
       */}
      {start != null && (
        <div className="astw:mr-auto astw:flex astw:min-w-0 astw:items-center astw:gap-2">
          {start}
        </div>
      )}
      <div className="astw:ml-auto astw:flex astw:flex-wrap astw:items-center astw:justify-end astw:gap-2">
        {children}
      </div>
    </div>
  );
}
Actions.displayName = "FormLayout.Actions";

// ============================================================================
// FormLayout
// ============================================================================

/** Implementation for {@link FormLayout}; exported below with its sub-components attached. */
function FormLayoutRoot({ columns = 2, className, style, children }: FormLayoutProps) {
  return (
    <FormLayoutContext.Provider value={{ columns }}>
      <div
        data-slot="form-layout"
        className={cn("astw:@container astw:w-full", className)}
        style={style}
      >
        <div
          data-slot="form-layout-grid"
          className={cn(
            gridClasses(columns),
            "astw:has-[>[data-slot=form-layout-section]]:gap-y-6",
          )}
        >
          {children}
        </div>
      </div>
    </FormLayoutContext.Provider>
  );
}

/**
 * Typed explicitly rather than assigning onto a `function FormLayout`, for the
 * same declaration-rollup reason as `Layout` (see `check-dts`).
 */
type FormLayoutComponent = typeof FormLayoutRoot & {
  Section: typeof Section;
  Item: typeof Item;
  Actions: typeof Actions;
};

/**
 * FormLayout — Lays out form fields in a responsive grid.
 *
 * Put it inside `<Form>` and place `Field.Root`s, `FormLayout.Section`s,
 * `FormLayout.Item`s and `FormLayout.Actions` in it. `columns` is the most
 * columns to show; the grid steps down to one column as its container
 * narrows, so one form definition fits a Dialog, a Sheet or a page.
 *
 * Widen a field with `span` on `Field.Root` / `Fieldset.Root` (`2`, `3` or
 * `"full"`). Spans never exceed the columns currently shown.
 *
 * @example
 * ```tsx
 * // Modal: fields straight in the grid
 * <Form id="supplier-form" onFormSubmit={save}>
 *   <FormLayout columns={2}>
 *     <Field.Root name="name">…</Field.Root>
 *     <Field.Root name="code">…</Field.Root>
 *     <Field.Root name="notes" span="full">…</Field.Root>
 *   </FormLayout>
 * </Form>
 *
 * // Page: one card per section
 * <Form id="po-form" onFormSubmit={save}>
 *   <FormLayout columns={3}>
 *     <FormLayout.Section title="Supplier">…</FormLayout.Section>
 *     <FormLayout.Section title="Delivery">…</FormLayout.Section>
 *   </FormLayout>
 * </Form>
 * ```
 */
export const FormLayout: FormLayoutComponent = Object.assign(FormLayoutRoot, {
  Section,
  Item,
  Actions,
});
