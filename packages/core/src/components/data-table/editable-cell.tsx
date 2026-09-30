import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type CompositionEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { getLocalTimeZone, parseDate, today, type CalendarDate } from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeList } from "@/components/badge-list";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Input } from "@/components/input";
import { SelectParts } from "@/components/select";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import type { Column } from "./types";
import {
  formatColumnNumber,
  getCellValue,
  renderTypedValue,
  resolveMoneyCurrency,
} from "./cell-renderers";
import {
  currencyFractionDigits,
  evaluateNumberDraft,
  evaluateTextDraft,
  isAllowedNumberText,
  isIsoDate,
  isLiveError,
  isPromiseLike,
  normalizeNumberText,
  optionLabel,
  resolveBadgeOptions,
  sameDate,
  sameNumber,
  toCalendarDate,
  toIsoDateTime,
  toNumberEditText,
  toNumberValue,
  toTextValue,
  toTimeText,
  type CellEditError,
  type DraftEvaluation,
  type NumberEditRules,
} from "./cell-edit";
import type { CellEditNavigation } from "./use-cell-edit-navigation";
import { useDataTableT } from "./i18n";

/**
 * A column whose cells can be edited in place.
 *
 * @internal
 */
export type EditableColumn<TRow extends Record<string, unknown>> = Extract<
  Column<TRow>,
  { type: "text" | "number" | "money" | "date" | "badge" | "link" }
>;

type ChoiceColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "text" | "link" | "badge" }
>;

type DateColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "date" }
>;

// The dropdown choices a column offers, or `undefined` when it's typed into.
function columnChoices<TRow extends Record<string, unknown>>(col: Column<TRow>) {
  if (col.type === "badge")
    return resolveBadgeOptions(col.edit?.options, col.typeOptions, col.filter);
  if (col.type === "text" || col.type === "link") return col.edit?.options;
  return undefined;
}

/**
 * Whether the column carries an `edit` config it can use: any typed column
 * except a `badge` one with no choices to offer.
 *
 * @internal
 */
export function isEditableColumn<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
): col is EditableColumn<TRow> {
  if (col.edit === undefined || col.type === undefined) return false;
  return col.type !== "badge" || (columnChoices(col)?.length ?? 0) > 0;
}

/**
 * Whether an editable column edits through a dropdown or calendar (the same
 * split `DataTableEditableCell` makes), whose cells keep their right edge free
 * for the icon.
 *
 * @internal
 */
export function hasPickerEditor<TRow extends Record<string, unknown>>(
  col: EditableColumn<TRow>,
): boolean {
  return (
    col.type === "date" ||
    col.type === "badge" ||
    ((col.type === "text" || col.type === "link") && Boolean(col.edit?.options))
  );
}

/**
 * Room for the dropdown / calendar icon (16px plus a gap), so a value ends — or
 * truncates — before it instead of running underneath. Read-only cells of the
 * same column keep it too, so the column's width doesn't change as rows become
 * editable or not.
 *
 * @internal
 */
export const ICON_SPACE_CLASS_NAME = "astw:pr-5";

// Editors cover the whole cell, end to end, instead of taking part in layout,
// so a cell becoming editable — or being edited — never changes row height or
// column width. They inherit the cell's padding (they're its direct children),
// so their text lines up exactly with the cell's own display underneath.
const OVERLAY_CLASS_NAME =
  "astw:absolute astw:inset-0 astw:h-full astw:w-full astw:p-[inherit] astw:rounded-none astw:border-0 astw:shadow-none astw:bg-transparent astw:dark:bg-transparent";

// Spreadsheet-style: nothing at rest, and the cell being edited outlines its
// edges (an inset ring, so it never spills onto neighbouring cells).
const CELL_FOCUS_CLASS_NAME = cn(
  "astw:outline-none astw:focus:ring-2 astw:focus:ring-inset astw:focus:ring-primary",
  "astw:focus-visible:ring-2 astw:focus-visible:ring-inset astw:focus-visible:ring-primary",
  "astw:aria-invalid:ring-2 astw:aria-invalid:ring-inset astw:aria-invalid:ring-destructive astw:dark:aria-invalid:ring-destructive",
);

// Text and number cells: the whole cell shows a text cursor.
const INPUT_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:text-sm astw:cursor-text",
);

// Dropdown and calendar cells: a transparent button over the cell's own display
// (labels, badges, dates) with a pointer cursor. Like a spreadsheet's dropdown
// arrow, the chevron / calendar icon appears only on hover, focus or while open,
// in the space the cell's display leaves free for it (`withIcon`).
const TRIGGER_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:flex astw:items-center astw:justify-end astw:cursor-pointer",
  "astw:data-popup-open:ring-2 astw:data-popup-open:ring-inset astw:data-popup-open:ring-primary",
  "astw:[&_svg]:opacity-0 astw:[&_svg]:transition-opacity",
  "astw:hover:[&_svg]:opacity-50 astw:focus:[&_svg]:opacity-50 astw:data-popup-open:[&_svg]:opacity-50",
);

interface PendingCommit<TRow> {
  id: number;
  value: unknown;
  /** The row object the save was made against. */
  row: TRow;
  settled: boolean;
}

type CellValidate<TRow> = ((value: unknown, row: TRow) => string | null | undefined) | undefined;

/**
 * The value a cell shows and the `save` that hands a new one to
 * `edit.onCommit`. A save still in flight — or settled but not yet reflected
 * in `data` — keeps showing its value; fresh data for the row (a new row
 * object) supersedes it, and a rejected save reverts the cell.
 */
function useCellCommit<TRow extends Record<string, unknown>>(row: TRow, col: EditableColumn<TRow>) {
  const [pending, setPending] = useState<PendingCommit<TRow> | null>(null);
  const commitIdRef = useRef(0);
  const inFlight = pending && (!pending.settled || pending.row === row) ? pending : null;
  const current = inFlight ? inFlight.value : getCellValue(row, col);

  const save = (value: unknown) => {
    const id = ++commitIdRef.current;
    const returned = (col.edit?.onCommit as ((row: TRow, value: unknown) => unknown) | undefined)?.(
      row,
      value,
    );
    if (!isPromiseLike(returned)) {
      setPending(null);
      return;
    }
    setPending({ id, value, row, settled: false });
    // Only the latest save for this cell may settle it, so an older request
    // failing late can't revert a newer value.
    returned.then(
      () => setPending((p) => (p?.id === id ? { ...p, settled: true } : p)),
      () => setPending((p) => (p?.id === id ? null : p)),
    );
  };

  let display: ReactNode;
  if (inFlight) display = renderTypedValue(row, col, inFlight.value, { linkAsText: true });
  else if (col.render) display = col.render(row);
  else display = renderTypedValue(row, col, current, { linkAsText: true });

  return { current, display, save };
}

/**
 * Registers the cell's focusable element with the table's Enter / Tab
 * navigation. Unregisters on every detach instead of returning a ref cleanup:
 * `Input` and `Select.Trigger` merge refs with a plain callback that calls ours
 * with `null` and drops any cleanup we return.
 */
function useNavigationRef<T extends HTMLElement>(
  navigation: CellEditNavigation,
  rowKey: string,
  colKey: string,
) {
  const unregisterRef = useRef<(() => void) | null>(null);
  return useCallback(
    (element: T | null) => {
      unregisterRef.current?.();
      unregisterRef.current = element ? navigation.register(rowKey, colKey, element) : null;
    },
    [navigation, rowKey, colKey],
  );
}

function EditableCellFrame({
  cellProps,
  display,
  truncate,
  hideDisplay,
  withIcon,
  errorId,
  description,
  children,
}: {
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  truncate?: boolean;
  /** Typing cells hide the display while the input shows the raw value. */
  hideDisplay?: "focused" | "forced-colors";
  /** Dropdown and date cells keep the cell's right edge free for their icon. */
  withIcon?: boolean;
  errorId: string;
  description: string | undefined;
  children: ReactNode;
}) {
  return (
    <Table.Cell
      {...cellProps}
      data-editable=""
      // The editor is positioned against the cell. A pinned cell is already
      // positioned (sticky), which its inline style keeps.
      className={cn(cellProps.className, "astw:relative")}
      // Editing a cell must never fire `onClickRow`.
      onClick={(event) => event.stopPropagation()}
    >
      <span
        aria-hidden="true"
        className={cn(
          "astw:block",
          truncate && "astw:truncate",
          withIcon && ICON_SPACE_CLASS_NAME,
          // Transparent input text is forced visible in forced-colors mode;
          // hide the display instead so the two don't overlap.
          hideDisplay && "astw:forced-colors:invisible",
          hideDisplay === "focused" && "astw:invisible",
        )}
      >
        {display}
      </span>
      {children}
      {description !== undefined && (
        <span id={errorId} className="astw:sr-only">
          {description}
        </span>
      )}
    </Table.Cell>
  );
}

function defaultMaxDecimals<TRow extends Record<string, unknown>>(
  col: EditableColumn<TRow>,
  row: TRow,
): number {
  if (col.type === "money") {
    return (
      col.typeOptions?.maxDecimals ??
      currencyFractionDigits(resolveMoneyCurrency(col.typeOptions, row))
    );
  }
  if (col.type === "number") {
    return col.typeOptions?.maxDecimals ?? col.typeOptions?.minDecimals ?? 0;
  }
  return 0;
}

function resolveNumberRules<TRow extends Record<string, unknown>>(
  col: EditableColumn<TRow>,
  row: TRow,
): NumberEditRules | undefined {
  if (col.type !== "number" && col.type !== "money") return undefined;
  const edit = col.edit;
  return {
    min: edit?.min,
    max: edit?.max,
    maxDecimals: edit?.maxDecimals ?? defaultMaxDecimals(col, row),
    required: edit?.required === true,
  };
}

// iOS number pads have no minus key, so a column that allows negatives keeps
// the full keyboard.
function numberInputMode(rules: NumberEditRules): "numeric" | "decimal" | "text" {
  if (rules.min === undefined || rules.min < 0) return "text";
  return rules.maxDecimals === 0 ? "numeric" : "decimal";
}

interface DataTableEditableCellProps<
  TRow extends Record<string, unknown>,
  TColumn extends EditableColumn<TRow> = EditableColumn<TRow>,
> {
  row: TRow;
  col: TColumn;
  rowKey: string;
  colKey: string;
  /** Accessible name for the editor — the column's label. */
  label: string;
  align: "left" | "right";
  navigation: CellEditNavigation;
  /** `data-slot`, style, class and context-menu handlers shared with static cells. */
  cellProps: ComponentProps<typeof Table.Cell>;
}

/**
 * A body cell whose value can be edited in place. The value belongs to the
 * consumer: the cell only holds a draft while it is being edited, and hands
 * the new value to `edit.onCommit` when the user leaves the cell, presses
 * Enter / Tab, or picks a choice.
 *
 * - `number`, `money`, and `text` / `link` without choices are typed into.
 * - `badge`, and `text` / `link` with `edit.options`, open a dropdown.
 * - `date` opens a calendar.
 *
 * @internal
 */
export function DataTableEditableCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow>,
) {
  const { col } = props;
  if (col.type === "date") return <DateEditCell {...props} col={col} />;
  if (col.type === "badge" || ((col.type === "text" || col.type === "link") && col.edit?.options)) {
    return <ChoiceEditCell {...props} col={col} />;
  }
  return <TypingEditCell {...props} col={col} />;
}

// ── Typing: text, number, money, link ───────────────────────────────────────

function TypingEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  align,
  navigation,
  cellProps,
}: DataTableEditableCellProps<TRow>) {
  const t = useDataTableT();
  const errorId = useId();
  const edit = col.edit;
  const validate = edit?.validate as CellValidate<TRow>;
  const { current, display, save } = useCellCommit(row, col);
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);

  const [draft, setDraftState] = useState<string | null>(null);
  // Read by handlers that run before the next render: the blur fired by moving
  // focus right after Enter must see that Enter already committed the draft.
  const draftRef = useRef<string | null>(null);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const [focused, setFocused] = useState(false);
  // Errors that typing can still fix wait for a save attempt; after one fails,
  // every error shows (and clears) live until the draft is committed or reverted.
  const [showAllErrors, setShowAllErrors] = useState(false);
  const pastingRef = useRef(false);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);

  const rules = resolveNumberRules(col, row);
  const baselineText = rules
    ? toNumberEditText(toNumberValue(current))
    : (toTextValue(current) ?? "");
  const text = draft ?? baselineText;

  const evaluate = (value: string): DraftEvaluation<unknown> => {
    const check = (parsed: unknown) => validate?.(parsed, row);
    return rules
      ? evaluateNumberDraft(value, rules, check)
      : evaluateTextDraft(value, edit?.required === true, check);
  };

  // A draft that reads the same as the stored value (`10.00` over `10`) is a
  // no-op: it neither commits nor reports an error.
  const isUnchanged = (draftText: string, result: DraftEvaluation<unknown>) => {
    if (draftText === baselineText) return true;
    if (result.error?.code === "number") return false;
    return rules
      ? sameNumber(result.value as number | null, toNumberValue(current))
      : result.value === toTextValue(current);
  };

  const evaluation = draft === null ? null : evaluate(draft);
  const error =
    draft !== null && evaluation && !isUnchanged(draft, evaluation) ? evaluation.error : null;
  const visibleError = error && (showAllErrors || isLiveError(error)) ? error : null;

  const describe = (e: CellEditError): string => {
    switch (e.code) {
      case "required":
        return t("editRequired");
      case "number":
        return t("editNotANumber");
      case "decimals":
        return e.maxDecimals === 0
          ? t("editWholeNumber")
          : t("editMaxDecimals", { count: e.maxDecimals });
      case "min":
        return t("editMin", { min: formatColumnNumber(row, col, e.min) });
      case "max":
        return t("editMax", { max: formatColumnNumber(row, col, e.max) });
      case "custom":
        return e.message;
    }
  };
  const message = visibleError ? describe(visibleError) : undefined;

  const revert = () => {
    setDraft(null);
    setShowAllErrors(false);
  };

  // Commits the draft if it changed and passes every rule. Returns whether focus
  // may leave the cell — `false` when a rule blocks the save.
  const commitDraft = (): boolean => {
    const draftText = draftRef.current;
    if (draftText === null) return true;
    const result = evaluate(draftText);
    if (isUnchanged(draftText, result)) {
      revert();
      return true;
    }
    if (result.error) {
      setShowAllErrors(true);
      return false;
    }
    revert();
    save(result.value);
    return true;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!rules || composingRef.current) {
      setDraft(next);
      return;
    }
    // Text that arrives in one go — a paste, a drop, autofill, dictation — is
    // cleaned up, then left for the rules to judge: never silently dropped or
    // rounded the way single keystrokes are filtered below.
    const { inputType, data } = event.nativeEvent as Partial<InputEvent>;
    const bulk =
      pastingRef.current ||
      inputType === "insertFromPaste" ||
      inputType === "insertFromDrop" ||
      (typeof data === "string" && data.length > 1);
    if (bulk) {
      pastingRef.current = false;
      setDraft(normalizeNumberText(next));
      return;
    }
    // Characters that can never be valid are dropped: leaving the draft
    // untouched makes React restore the input's previous value.
    if (isAllowedNumberText(next, rules)) setDraft(next);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    if (rules) setDraft(normalizeNumberText(event.currentTarget.value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    pastingRef.current = false;
    // While an IME is composing, Enter confirms the conversion, not the cell.
    if (event.nativeEvent.isComposing || composingRef.current || event.keyCode === 229) return;
    const from = { rowKey, colKey };
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (commitDraft()) navigation.move(from, event.shiftKey ? "up" : "down");
        return;
      case "Tab":
        if (!commitDraft()) {
          event.preventDefault();
          return;
        }
        // At the first / last editable cell, native Tab leaves the table.
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      case "Escape":
        if (draftRef.current === null || draftRef.current === baselineText) return;
        // Handled here, so an enclosing dialog doesn't also close on this Esc.
        event.preventDefault();
        event.stopPropagation();
        revert();
        return;
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    event.currentTarget.select();
  };

  // Leaving the cell saves a valid change and quietly reverts an invalid one.
  const handleBlur = () => {
    setFocused(false);
    if (!commitDraft()) revert();
  };

  const handleMouseDown = (event: MouseEvent<HTMLInputElement>) => {
    if (focused) return;
    // A right-click on a resting cell opens DataTable's cell menu instead of editing.
    if (event.button === 2) {
      event.preventDefault();
      return;
    }
    selectOnMouseUpRef.current = true;
  };

  // The click that focuses the cell keeps the select-all from `handleFocus`;
  // otherwise mouseup would collapse it to a caret.
  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (!selectOnMouseUpRef.current) return;
    selectOnMouseUpRef.current = false;
    event.preventDefault();
  };

  // While editing, the browser's own menu and long-press (paste, select) win
  // over DataTable's cell menu.
  const stopWhileFocused = (event: MouseEvent | TouchEvent) => {
    if (focused) event.stopPropagation();
  };

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={focused ? "focused" : "forced-colors"}
      errorId={errorId}
      description={message === undefined ? undefined : `${message}. ${t("editRevertHint")}`}
    >
      <Tooltip.Root open={focused && message !== undefined}>
        <Tooltip.Trigger
          render={
            <Input
              ref={register}
              type="text"
              value={text}
              aria-label={label}
              aria-invalid={message !== undefined ? true : undefined}
              aria-describedby={message !== undefined ? errorId : undefined}
              inputMode={rules ? numberInputMode(rules) : undefined}
              enterKeyHint="next"
              autoComplete="off"
              spellCheck={rules ? false : undefined}
              className={cn(
                INPUT_CLASS_NAME,
                !focused && "astw:text-transparent",
                rules && "astw:tabular-nums",
                align === "right" && "astw:text-right",
              )}
              style={focused ? { WebkitTouchCallout: "default" } : undefined}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPaste={() => {
                pastingRef.current = true;
              }}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={handleCompositionEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onContextMenu={stopWhileFocused}
              onTouchStart={stopWhileFocused}
            />
          }
        />
        <Tooltip.Content>
          {message}
          <span className="astw:block astw:opacity-70">{t("editRevertHint")}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </EditableCellFrame>
  );
}

// ── Shared by the dropdown and calendar editors ─────────────────────────────

/**
 * Validates and commits a picked value, and owns the message shown when the
 * consumer's `validate` rejects it. Picking the current value is a no-op.
 */
function usePickCommit<TRow extends Record<string, unknown>>(
  row: TRow,
  col: EditableColumn<TRow>,
  save: (value: unknown) => void,
  isSame: (next: string | null) => boolean,
) {
  const [message, setMessage] = useState<string | undefined>(undefined);
  const commit = (next: string | null) => {
    setMessage(undefined);
    if (isSame(next)) return;
    if (next === null && col.edit?.required) return;
    const problem = (col.edit?.validate as CellValidate<TRow>)?.(next, row);
    if (problem) {
      setMessage(problem);
      return;
    }
    save(next);
  };
  return { message, clearMessage: () => setMessage(undefined), commit };
}

// Tab / Shift+Tab from a closed dropdown or calendar moves between editable
// cells, the same way it does from a typing cell.
function tabBetweenCells(
  event: KeyboardEvent<HTMLElement>,
  open: boolean,
  navigation: CellEditNavigation,
  from: { rowKey: string; colKey: string },
) {
  if (event.key !== "Tab" || open) return;
  if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
}

// ── Dropdown: badge, and text / link with choices ────────────────────────────

function ChoiceEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  navigation,
  cellProps,
}: DataTableEditableCellProps<TRow, ChoiceColumn<TRow>>) {
  const t = useDataTableT();
  const errorId = useId();
  const { current, display, save } = useCellCommit(row, col);
  const register = useNavigationRef<HTMLButtonElement>(navigation, rowKey, colKey);
  const value = toTextValue(current);
  const { message, clearMessage, commit } = usePickCommit(row, col, save, (next) => next === value);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const choices = columnChoices(col) ?? [];

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      withIcon
      errorId={errorId}
      description={message}
    >
      <SelectParts.Root<string | null>
        value={value}
        onValueChange={(next) => commit(next)}
        open={open}
        onOpenChange={setOpen}
        itemToStringLabel={(item) => String(optionLabel(choices, item) ?? t("editNone"))}
      >
        <Tooltip.Root open={focused && !open && message !== undefined}>
          <Tooltip.Trigger
            render={
              <SelectParts.Trigger
                ref={register}
                aria-label={label}
                aria-invalid={message !== undefined ? true : undefined}
                aria-describedby={message !== undefined ? errorId : undefined}
                className={TRIGGER_CLASS_NAME}
                onKeyDown={(event) => tabBetweenCells(event, open, navigation, { rowKey, colKey })}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  clearMessage();
                }}
              >
                <span className="astw:sr-only">
                  <SelectParts.Value />
                </span>
              </SelectParts.Trigger>
            }
          />
          <Tooltip.Content>{message}</Tooltip.Content>
        </Tooltip.Root>
        {/* At least as wide as the cell, and wide enough that choices don't wrap. */}
        <SelectParts.Content
          alignItemWithTrigger={false}
          className="astw:w-max astw:min-w-(--anchor-width) astw:max-w-80"
        >
          {!col.edit?.required && (
            <SelectParts.Item value={null}>
              <span className="astw:text-muted-foreground">{t("editNone")}</span>
            </SelectParts.Item>
          )}
          {choices.map((choice) => (
            <SelectParts.Item key={choice.value} value={choice.value}>
              {col.type === "badge" ? (
                <BadgeList
                  value={choice.value}
                  options={col.typeOptions}
                  resolveLabel={() => choice.label}
                />
              ) : (
                choice.label
              )}
            </SelectParts.Item>
          ))}
        </SelectParts.Content>
      </SelectParts.Root>
    </EditableCellFrame>
  );
}

// ── Calendar: date ───────────────────────────────────────────────────────────

// Where an empty calendar opens: today, or — when today can't be picked — the
// nearest day that can, so a bounded date never opens on a fully disabled month.
function nearestPickableDay(min: CalendarDate | undefined, max: CalendarDate | undefined) {
  const now = today(getLocalTimeZone());
  if (min && now.compare(min) < 0) return min;
  if (max && now.compare(max) > 0) return max;
  return undefined;
}

const POPUP_CLASS_NAME = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:flex astw:flex-col astw:gap-3 astw:rounded-md astw:border astw:border-border astw:p-3 astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

function DateEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  navigation,
  cellProps,
}: DataTableEditableCellProps<TRow, DateColumn<TRow>>) {
  const t = useDataTableT();
  const errorId = useId();
  const withTime = col.typeOptions?.dateFormat === "datetime";
  const { current, display, save } = useCellCommit(row, col);
  const register = useNavigationRef<HTMLButtonElement>(navigation, rowKey, colKey);
  const { message, clearMessage, commit } = usePickCommit(row, col, save, (next) =>
    sameDate(next, current, withTime),
  );
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // A date-time is picked in two steps (day, then time), so it's committed when
  // the calendar closes; a date commits as soon as a day is picked.
  const [draftDay, setDraftDay] = useState<CalendarDate | null>(null);
  const [draftTime, setDraftTime] = useState("");
  // The trigger shows only an icon (the date is the cell's own display, hidden
  // from screen readers), so its accessible name carries the date.
  const accessibleName = typeof display === "string" ? `${label}, ${display}` : label;
  const min = isIsoDate(col.edit?.min) ? parseDate(col.edit.min) : undefined;
  const max = isIsoDate(col.edit?.max) ? parseDate(col.edit.max) : undefined;
  const pickedDay = withTime ? draftDay : toCalendarDate(current);

  const handleOpenChange = (next: boolean, details?: { reason?: string }) => {
    if (next) {
      setDraftDay(toCalendarDate(current));
      setDraftTime(toTimeText(current));
    } else if (withTime && draftDay && details?.reason !== "escape-key") {
      commit(toIsoDateTime(draftDay, draftTime));
    }
    setOpen(next);
  };

  const handlePick = (day: CalendarDate) => {
    if (withTime) {
      setDraftDay(day);
      return;
    }
    commit(day.toString());
    setOpen(false);
  };

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      withIcon
      errorId={errorId}
      description={message}
    >
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Tooltip.Root open={focused && !open && message !== undefined}>
          <Tooltip.Trigger
            render={
              <Popover.Trigger
                ref={register}
                aria-label={accessibleName}
                aria-invalid={message !== undefined ? true : undefined}
                aria-describedby={message !== undefined ? errorId : undefined}
                className={TRIGGER_CLASS_NAME}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && !open) {
                    event.preventDefault();
                    handleOpenChange(true);
                    return;
                  }
                  tabBetweenCells(event, open, navigation, { rowKey, colKey });
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  clearMessage();
                }}
              >
                <CalendarDays className="astw:size-3.5 astw:opacity-50" aria-hidden="true" />
              </Popover.Trigger>
            }
          />
          <Tooltip.Content>{message}</Tooltip.Content>
        </Tooltip.Root>
        <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
          <Popover.Positioner sideOffset={4} side="bottom" align="start">
            <Popover.Popup data-slot="data-table-cell-calendar" className={POPUP_CLASS_NAME}>
              <Calendar
                aria-label={label}
                value={pickedDay}
                defaultFocusedValue={pickedDay ?? nearestPickableDay(min, max)}
                onChange={handlePick}
                minValue={min}
                maxValue={max}
              />
              {withTime && (
                <Input
                  type="time"
                  aria-label={`${label} (${t("chooseTime")})`}
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.target.value)}
                  className="astw:h-8 astw:text-sm"
                />
              )}
              {(withTime || !col.edit?.required) && (
                <div className="astw:flex astw:justify-between astw:gap-2">
                  {!col.edit?.required ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        commit(null);
                        setOpen(false);
                      }}
                    >
                      {t("editClear")}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {withTime && (
                    <Button size="sm" onClick={() => handleOpenChange(false)}>
                      {t("editDone")}
                    </Button>
                  )}
                </div>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </EditableCellFrame>
  );
}
