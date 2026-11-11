import type { CSSProperties, ReactNode } from "react";
import type { FormSpan } from "@/lib/form-span";

// ============================================================================
// FORM LAYOUT TYPES
// ============================================================================

/**
 * The most columns a form grid may show. The grid drops to fewer columns
 * when its container is narrower, so the same form fits a dialog, a sheet
 * or a full page.
 */
export type FormColumns = 1 | 2 | 3 | 4;

/** Visual treatment of a `FormLayout.Section`. */
export type FormSectionVariant = "card" | "plain";

/**
 * Props for the FormLayout component
 */
export interface FormLayoutProps {
  /**
   * The most columns to show. The grid reflows from this number down to one
   * column as its container narrows (≥880px → 4, ≥640px → 3, ≥400px → 2).
   * Sections inherit this value unless they set their own.
   * @default 2
   */
  columns?: FormColumns;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Fields, `FormLayout.Section`s, `FormLayout.Item`s and `FormLayout.Actions` */
  children: ReactNode;
}

/**
 * Props for FormLayout.Section
 */
export interface FormLayoutSectionProps {
  /** Section heading, rendered as an `h3` inside the fieldset's legend, so it also names the fieldset */
  title?: ReactNode;
  /** Supporting text under the title, also the fieldset's accessible description */
  description?: ReactNode;
  /** Header action slot (e.g. a "Copy from supplier" button) */
  action?: ReactNode;
  /** Overrides the columns inherited from `FormLayout` */
  columns?: FormColumns;
  /**
   * `"card"` draws the section as a card (use on pages).
   * `"plain"` draws a heading, with a divider when it follows another plain
   * section (use inside a Dialog or Sheet).
   * @default "card"
   */
  variant?: FormSectionVariant;
  /** Disables every field in the section */
  disabled?: boolean;
  /** Element id, e.g. for anchor navigation */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Child content */
  children?: ReactNode;
}

/**
 * Props for FormLayout.Item
 */
export interface FormLayoutItemProps {
  /** How many grid columns the item covers */
  span?: FormSpan;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Child content */
  children?: ReactNode;
}

/**
 * Props for FormLayout.Actions
 */
export interface FormLayoutActionsProps {
  /**
   * Pins the action bar to the bottom of the scrolling area, so Save stays
   * in reach on long forms.
   * @default false
   */
  sticky?: boolean;
  /** Content shown on the left of the bar (e.g. a "Last saved" note) */
  start?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Buttons, right-aligned. Put Cancel first and the primary action last. */
  children?: ReactNode;
}
