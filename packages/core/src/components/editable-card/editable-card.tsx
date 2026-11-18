import * as React from "react";
import { CalculatorIcon, CogIcon, LockIcon, ShieldIcon } from "lucide-react";

import { Button } from "../button";
import { Card } from "../card";
import { Field } from "../field";
import { Form } from "../form";
import { FormLayout } from "../form-layout";
import { Text } from "../text";
import { Tooltip } from "../tooltip";
import { useEditableCardT } from "./i18n";
import type {
  EditableCardFieldProps,
  EditableCardProps,
  EditableCardReadOnly,
  EditableCardReadOnlyKind,
} from "./types";

// ============================================================================
// Layout contract
//
// View and edit render the same cell for every field — the same grid slot,
// the same label row and a value slot the height of a control — so pressing
// Edit only swaps what is inside the value slot. Nothing else may differ
// between the modes, or fields move:
//
// - the label row has a fixed height whatever it holds (label, required
//   marker, hint icon);
// - view values sit in `Field.Value`, which reserves an input's height;
// - the header's action area has a fixed height and the title never wraps.
//
// Multi-line editors (a Textarea) grow their own cell; put them last.
// ============================================================================

const LABEL_ROW = "astw:flex astw:h-5 astw:min-w-0 astw:items-center astw:gap-1";
const LABEL = "astw:truncate astw:text-muted-foreground";

/** Shown for an empty value, as in `DescriptionCard`. */
const EMPTY_DASH = "–";

const READ_ONLY_ICONS: Record<EditableCardReadOnlyKind, typeof LockIcon> = {
  system: CogIcon,
  calculated: CalculatorIcon,
  locked: LockIcon,
  permission: ShieldIcon,
};

type Mode = "view" | "edit";

const EditableCardContext = React.createContext<Mode | null>(null);

function useEditableCardMode(): Mode {
  const mode = React.useContext(EditableCardContext);
  if (mode == null) {
    throw new Error("<EditableCard.Field> must be used within <EditableCard>");
  }
  return mode;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as { then?: unknown } | null | undefined)?.then === "function";

const isEmptyValue = (value: React.ReactNode) =>
  value === null || value === undefined || value === "";

/**
 * A failed save keeps the card in edit mode with the user's changes so they
 * can retry. The caller reports the failure (`errors`, a toast); log it
 * rather than rethrow, as a rethrow would surface as an unhandled rejection
 * even when the caller already handled the error.
 */
function reportSaveFailure(error: unknown) {
  console.error("[EditableCard] onSave failed:", error);
}

// The controls are the consumer's children, so the card holds no refs to
// them. Focus management finds the first one in the field grid instead,
// skipping the read-only hint buttons that sit in label rows.
const FOCUSABLE = 'input, select, textarea, button, [tabindex], [contenteditable="true"]';

function firstControl(root: HTMLElement | null): HTMLElement | undefined {
  if (!root) return undefined;
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled, input[type="hidden"]') &&
      !element.closest('[aria-hidden="true"], [data-slot="editable-card-read-only-hint"]'),
  );
}

// ============================================================================
// Read-only hint
// ============================================================================

function ReadOnlyHint({
  label,
  kind = "system",
  reason,
}: EditableCardReadOnly & { label: string }) {
  const Icon = READ_ONLY_ICONS[kind];
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            type="button"
            data-slot="editable-card-read-only-hint"
            data-kind={kind}
            aria-label={`${label}: ${reason}`}
            className="astw:inline-flex astw:size-4 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-sm astw:text-muted-foreground astw:hover:text-foreground"
          />
        }
      >
        <Icon className="astw:size-3.5" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Content position={{ side: "top" }}>{reason}</Tooltip.Content>
    </Tooltip.Root>
  );
}

// ============================================================================
// EditableCard.Field
// ============================================================================

/**
 * EditableCard.Field — One field, drawn the same way in view and edit mode.
 *
 * In view mode it shows `value` (a dash when it is empty). In edit mode it
 * shows its children (the control) in the same place — unless it has no
 * children or sets `readOnly`, in which case it keeps showing `value` and
 * adds a hint icon after the label whose tooltip gives the reason. A field
 * with children needs a `name`, the key of its value in `onSave`. In edit
 * mode the field shows its error under the control: the browser's
 * validation message, or the field's entry in the card's `errors`.
 *
 * @example
 * ```tsx
 * <EditableCard.Field name="paymentTerms" label="Payment terms" value={po.paymentTerms}>
 *   <Select items={PAYMENT_TERMS} defaultValue={po.paymentTerms} />
 * </EditableCard.Field>
 *
 * <EditableCard.Field
 *   label="Status"
 *   value={<Badge variant="outline-info">Confirmed</Badge>}
 *   readOnly={{ kind: "system", reason: "Changes as the order moves through approval." }}
 * />
 * ```
 */
function EditableCardField({
  name,
  label,
  span,
  value,
  children,
  readOnly,
  required,
}: EditableCardFieldProps) {
  const mode = useEditableCardMode();
  const t = useEditableCardT();
  const editing = mode === "edit";
  const editable = children != null && readOnly == null;

  let shownValue: React.ReactNode = value;
  if (isEmptyValue(value)) {
    shownValue = <span className="astw:text-muted-foreground">{EMPTY_DASH}</span>;
  } else if (typeof value === "string" || typeof value === "number") {
    shownValue = <span className="astw:truncate">{value}</span>;
  }

  return (
    <Field.Root
      name={editing && editable ? name : undefined}
      span={span}
      data-editable-card-field=""
    >
      <div className={LABEL_ROW}>
        <Field.Label required={editing && editable && required} className={LABEL}>
          {label}
        </Field.Label>
        {editing && !editable && (
          <ReadOnlyHint
            label={label}
            kind={readOnly?.kind}
            reason={readOnly?.reason ?? t("readOnlyDefault")}
          />
        )}
      </div>
      {editing && editable ? (
        <>
          {children}
          {/* The browser's validation message, or this field's entry in `errors` */}
          <Field.Error />
        </>
      ) : (
        <Field.Value>{shownValue}</Field.Value>
      )}
    </Field.Root>
  );
}
EditableCardField.displayName = "EditableCard.Field";

// ============================================================================
// EditableCard
// ============================================================================

/** Where focus goes once a mode switch the user started has rendered. */
type FocusTarget = "fields" | "edit" | "save";

/** Implementation for {@link EditableCard}; exported below with `Field` attached. */
function EditableCardRoot<
  // `any` (as in `Form`) so interface-declared value types are accepted too.
  Values extends Record<string, any> = Record<string, unknown>,
>({
  title,
  columns = 3,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  onSave,
  onCancel,
  errors,
  editDisabled = false,
  className,
  style,
  children,
}: EditableCardProps<Values>) {
  const t = useEditableCardT();
  const formId = React.useId();
  const [editingState, setEditingState] = React.useState(defaultEditing);
  const [saving, setSaving] = React.useState(false);
  const editing = editingProp ?? editingState;
  const mode: Mode = editing ? "edit" : "view";

  const fieldsRef = React.useRef<HTMLDivElement>(null);
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const saveButtonRef = React.useRef<HTMLButtonElement>(null);
  // Set by the card's own buttons and Escape, so a switch that comes from
  // outside (a controlled `editing` prop, `defaultEditing`) leaves focus where
  // it is. The element to focus only exists once the new mode has rendered,
  // so the effect below moves focus after that commit.
  const focusAfterSwitch = React.useRef<FocusTarget | null>(null);

  React.useEffect(() => {
    const target = focusAfterSwitch.current;
    if (target == null || saving) return;
    focusAfterSwitch.current = null;
    if (target === "fields" && mode === "edit") {
      firstControl(fieldsRef.current)?.focus();
    } else if (target === "edit" && mode === "view") {
      editButtonRef.current?.focus();
    } else if (target === "save" && mode === "edit") {
      // Save was disabled while saving, which drops focus. Put it back unless
      // the form already moved it (to the first field with an error).
      const active = saveButtonRef.current?.ownerDocument.activeElement;
      if (active == null || active === active.ownerDocument.body) saveButtonRef.current?.focus();
    }
  }, [mode, saving]);

  const setEditing = (next: boolean) => {
    focusAfterSwitch.current = next ? "fields" : "edit";
    if (editingProp === undefined) setEditingState(next);
    onEditingChange?.(next);
  };

  const cancel = () => {
    onCancel?.();
    setEditing(false);
  };

  const handleSubmit = (values: Values) => {
    if (saving) return;
    let result: unknown;
    try {
      result = onSave?.(values);
    } catch (error) {
      reportSaveFailure(error);
      return;
    }
    if (!isThenable(result)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    result.then(
      () => {
        setSaving(false);
        setEditing(false);
      },
      (error: unknown) => {
        focusAfterSwitch.current = "save";
        setSaving(false);
        reportSaveFailure(error);
      },
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !editing || saving) return;
    // A control that handles Escape itself (closing a Combobox list) marks it
    // handled. React also bubbles events out of portals, so an Escape in a
    // Select or DatePicker popup reaches this card; it closes the popup only.
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (!event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    cancel();
  };

  return (
    <Card.Root
      data-slot="editable-card"
      data-mode={mode}
      className={className}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <Form<Values>
        id={formId}
        errors={errors}
        aria-busy={saving || undefined}
        onFormSubmit={handleSubmit}
      >
        {/* Header — one line, with an action area of fixed height */}
        <div className="astw:flex astw:items-center astw:justify-between astw:gap-4 astw:px-6 astw:py-6">
          <Text.h3
            variant="heading-md"
            className="astw:min-w-0 astw:truncate astw:leading-none"
            data-slot="editable-card-title"
          >
            {title}
          </Text.h3>
          <div className="astw:flex astw:h-8 astw:shrink-0 astw:items-center astw:gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={cancel}
                >
                  {t("cancel")}
                </Button>
                <Button ref={saveButtonRef} type="submit" size="sm" disabled={saving}>
                  {t("save")}
                </Button>
              </>
            ) : (
              <Button
                ref={editButtonRef}
                type="button"
                variant="outline"
                size="sm"
                disabled={editDisabled}
                onClick={() => setEditing(true)}
              >
                {t("edit")}
              </Button>
            )}
          </div>
        </div>

        {/* Fields — one grid for both modes */}
        <div ref={fieldsRef} className="astw:px-6 astw:pb-6">
          <EditableCardContext.Provider value={mode}>
            <FormLayout columns={columns}>{children}</FormLayout>
          </EditableCardContext.Provider>
        </div>
      </Form>
    </Card.Root>
  );
}

/**
 * Typed explicitly rather than assigning onto a `function EditableCard`, for
 * the same declaration-rollup reason as `FormLayout` (see `check-dts`).
 */
type EditableCardComponent = typeof EditableCardRoot & {
  Field: typeof EditableCardField;
};

/**
 * EditableCard — A record card that is edited in place.
 *
 * View and edit are one card with one field list: every `EditableCard.Field`
 * keeps its exact position when Edit is pressed, and only its value turns
 * into a control. Fields that can't be edited keep their view rendering and
 * gain a hint icon saying why. Save submits only this card, so a page can
 * hold several cards that are each saved on their own.
 *
 * Edit moves focus to the first control; Cancel, Escape and a successful
 * save return it to Edit. A rejected or throwing `onSave` keeps the card in
 * edit mode — pass server errors back through `errors` to show them under
 * their fields.
 *
 * @example
 * ```tsx
 * <EditableCard<OrderValues> title="Order details" columns={3} errors={errors} onSave={save}>
 *   <EditableCard.Field
 *     label="Status"
 *     value={<Badge variant="outline-info">Confirmed</Badge>}
 *     readOnly={{ reason: "Changes as the order moves through approval." }}
 *   />
 *   <EditableCard.Field name="shipTo" label="Ship to" value={po.shipTo}>
 *     <Select items={WAREHOUSES} defaultValue={po.shipTo} />
 *   </EditableCard.Field>
 * </EditableCard>
 * ```
 */
export const EditableCard: EditableCardComponent = Object.assign(EditableCardRoot, {
  Field: EditableCardField,
});
