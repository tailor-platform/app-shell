import type { CSSProperties, ReactNode } from "react";
import type { FormProps } from "../form";
import type { FormSpan } from "@/lib/form-span";
import type { FormColumns } from "../form-layout/types";

// ============================================================================
// EDITABLE CARD TYPES
// ============================================================================

/**
 * Why a field can't be edited in place. Picks the hint icon shown after the
 * label in edit mode.
 *
 * - `"system"` — set by the system: status, document number, audit fields
 * - `"calculated"` — derived from other values; keep it updating while editing
 * - `"locked"` — editable once, then frozen by the record's state
 * - `"permission"` — someone else can change it, this user can't
 */
export type EditableCardReadOnlyKind = "system" | "calculated" | "locked" | "permission";

/** Marks a field read-only in edit mode and says why. */
export interface EditableCardReadOnly {
  /** Picks the hint icon. Default: `"system"`. */
  kind?: EditableCardReadOnlyKind;
  /** Shown in the hint's tooltip and read by screen readers. */
  reason: string;
}

/**
 * Props for the EditableCard component.
 *
 * `Values` types what `onSave` receives — the values of the fields that have
 * a `name`, keyed by that name. Pass it as a type argument:
 * `<EditableCard<OrderValues> onSave={(values) => …}>`.
 */
export interface EditableCardProps<
  // `any` (as in `Form`) so interface-declared value types are accepted too.
  Values extends Record<string, any> = Record<string, unknown>,
> {
  /** Card title */
  title: ReactNode;
  /**
   * The most columns to show, as in `FormLayout`. Both modes use the same
   * grid, so fields keep their position when editing starts. Default: `3`.
   */
  columns?: FormColumns;
  /** Whether the card is in edit mode (controlled). */
  editing?: boolean;
  /** Initial edit mode when uncontrolled. Default: `false`. */
  defaultEditing?: boolean;
  /** Called when Edit or Cancel is pressed, on Escape, and after a successful save. */
  onEditingChange?: (editing: boolean) => void;
  /**
   * Called with the form's values on Save, once the fields pass validation.
   * Return a promise to keep the card in edit mode (with Save and Cancel
   * disabled) until it settles: the card leaves edit mode when the promise
   * resolves, and stays in it with the user's changes when it rejects or
   * `onSave` throws. Report the failure yourself — field messages through
   * `errors`, anything else in a toast.
   */
  onSave?: (values: Values) => void | Promise<void>;
  /** Called when the user cancels editing, with Cancel or Escape. */
  onCancel?: () => void;
  /**
   * Errors to show under fields, keyed by field `name` — typically returned
   * by the server after a rejected save. As in `Form`, a field's error clears
   * when the user edits it.
   */
  errors?: FormProps["errors"];
  /**
   * Disables the Edit button — for example while another card on the page is
   * being edited, so there is only ever one set of unsaved changes.
   */
  editDisabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** `EditableCard.Field`s, or any other grid content. */
  children?: ReactNode;
}

interface EditableCardFieldBaseProps {
  /** Field label, shown in both modes. */
  label: string;
  /** Grid columns the field covers, as `span` on `Field.Root`. */
  span?: FormSpan;
  /**
   * The value as it reads in view mode — text or any element (a Badge, a
   * link). Read-only fields keep showing it in edit mode. `null`, `undefined`
   * and `""` show a dash.
   */
  value: ReactNode;
  /** Keeps the field read-only in edit mode, with a hint saying why. */
  readOnly?: EditableCardReadOnly;
  /** Shows the required marker in edit mode. Put `required` on the control as well. */
  required?: boolean;
}

/**
 * Props for EditableCard.Field.
 *
 * A field with a control (`children`) needs a `name`, or its value would be
 * missing from `onSave`. A field without a control is never editable and
 * may leave `name` out.
 */
export type EditableCardFieldProps =
  | (EditableCardFieldBaseProps & {
      /** Form field name — the key of this field's value in `onSave`. */
      name: string;
      /**
       * The control shown in edit mode (`Field.Control`, `Select`, `DatePicker`…).
       * Leave it out for a field that is never editable.
       */
      children: ReactNode;
    })
  | (EditableCardFieldBaseProps & {
      name?: string;
      children?: never;
    });
