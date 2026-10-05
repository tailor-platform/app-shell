import {
  useCallback,
  useEffect,
  useId,
  useMemo,
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
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Popover } from "@base-ui/react/popover";
import { getLocalTimeZone, parseDate, today, type CalendarDate } from "@internationalized/date";
import { CalendarDays, ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeList } from "@/components/badge-list";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { ComboboxParts } from "@/components/combobox";
import { Input } from "@/components/input";
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
  isIsoDate,
  isPromiseLike,
  normalizeNumberText,
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
import { cellEditId, type CellEditStore, type KeptDraft } from "./use-cell-edit-store";
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
 * Room for the icon every editable cell shows at its right edge (a pen, a
 * chevron or a calendar; 14px plus a gap), so a value ends — or truncates —
 * before it instead of running underneath. Read-only cells of the same column
 * keep it too, so the column's width doesn't change as rows become editable or
 * not.
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

// Spreadsheet-style: the cell being edited outlines its edges (an inset ring,
// so it never spills onto neighbouring cells).
const CELL_FOCUS_CLASS_NAME = cn(
  "astw:outline-none astw:focus:ring-2 astw:focus:ring-inset astw:focus:ring-primary",
  "astw:focus-visible:ring-2 astw:focus-visible:ring-inset astw:focus-visible:ring-primary",
);

// A broken rule in the cell being edited: red, with the message in a tooltip.
const CELL_ERROR_CLASS_NAME =
  "astw:ring-2 astw:ring-inset astw:ring-destructive astw:focus:ring-destructive astw:focus-visible:ring-destructive";

// A value left in a cell that breaks a rule: kept, marked orange, never saved.
const CELL_KEPT_CLASS_NAME = "astw:ring-2 astw:ring-inset astw:ring-status-attention";

const ruleClassName = (message: string | undefined, focused: boolean) => {
  if (message === undefined) return undefined;
  return focused ? CELL_ERROR_CLASS_NAME : CELL_KEPT_CLASS_NAME;
};

// Text, number and dropdown cells are typed into: the whole cell shows a text
// cursor, and the text stops before the cell's icon.
const INPUT_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:text-sm astw:cursor-text astw:pr-7 astw:[td:last-child>&]:pr-11",
);

// Date cells: a transparent button over the cell's own display, with a pointer.
const TRIGGER_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:cursor-pointer",
  "astw:data-popup-open:ring-2 astw:data-popup-open:ring-inset astw:data-popup-open:ring-primary",
);

// The icon that says how a cell is edited: shown while the cell is hovered or
// being edited (the column header's pen says it's editable at rest).
// Decoration only: a click anywhere in the cell goes to the editor underneath.
const CELL_ICON_CLASS_NAME = cn(
  "astw:pointer-events-none astw:absolute astw:inset-y-0 astw:right-2 astw:flex astw:items-center astw:[td:last-child>&]:right-6",
  "astw:text-muted-foreground astw:opacity-0 astw:transition-opacity",
  "astw:group-hover/cell:opacity-30 astw:group-focus-within/cell:opacity-30",
  "astw:[&_svg]:size-3.5",
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
function useCellCommit<TRow extends Record<string, unknown>>(
  row: TRow,
  col: EditableColumn<TRow>,
  store: CellEditStore,
) {
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
    // Counted as unsaved until it settles, so leaving the page waits for it.
    store.trackSave(returned);
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
 * `Input` and `Combobox.Input` merge refs with a plain callback that calls ours
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
  icon,
  errorId,
  description,
  children,
}: {
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  truncate?: boolean;
  /** Typed-into cells hide the display while the input shows the text. */
  hideDisplay?: "focused" | "forced-colors";
  /** Shown at the cell's right edge at all times: what kind of editor this is. */
  icon: ReactNode;
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
      className={cn(cellProps.className, "astw:relative astw:group/cell")}
      // Editing a cell must never fire `onClickRow`.
      onClick={(event) => event.stopPropagation()}
    >
      <span
        aria-hidden="true"
        className={cn(
          "astw:block",
          ICON_SPACE_CLASS_NAME,
          truncate && "astw:truncate",
          // Transparent input text is forced visible in forced-colors mode;
          // hide the display instead so the two don't overlap.
          hideDisplay && "astw:forced-colors:invisible",
          hideDisplay === "focused" && "astw:invisible",
        )}
      >
        {display}
      </span>
      {children}
      <span aria-hidden="true" className={CELL_ICON_CLASS_NAME}>
        {icon}
      </span>
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

// The on-screen keyboard a number cell asks for. It's a hint, not a filter:
// anything can be typed, and the rules judge it on save. iOS number pads have
// no minus key, so a column that allows negatives keeps the full keyboard.
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
  /** What the table hasn't saved yet: kept values, cells mid-edit, saves in flight. */
  store: CellEditStore;
  /** `data-slot`, style, class and context-menu handlers shared with static cells. */
  cellProps: ComponentProps<typeof Table.Cell>;
}

/**
 * A body cell whose value can be edited in place. The value belongs to the
 * consumer: the cell only holds a draft while it is being edited (or while a
 * value the user left breaks a rule), and hands a new value to
 * `edit.onCommit` when the user leaves the cell, presses Enter / Tab, or picks
 * a choice.
 *
 * - `number`, `money`, and `text` / `link` without choices are typed into.
 * - `badge`, and `text` / `link` with `edit.options`, are dropdowns you can
 *   type into to search.
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
  store,
  cellProps,
}: DataTableEditableCellProps<TRow>) {
  const t = useDataTableT();
  const errorId = useId();
  const cellId = cellEditId(rowKey, colKey);
  const edit = col.edit;
  const validate = edit?.validate as CellValidate<TRow>;
  const { current, display, save } = useCellCommit(row, col, store);
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);

  // A value left behind that breaks a rule comes back with the cell, e.g. after
  // paging away and back.
  const [restored] = useState(() => store.getKept(cellId));
  const [draft, setDraftState] = useState<string | null>(restored ? String(restored.value) : null);
  // Read by handlers that run before the next render: the blur fired by moving
  // focus right after Enter must see that Enter already committed the draft.
  const draftRef = useRef(draft);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Errors wait until the user tries to save (Enter, Tab or leaving the cell).
  // After that they follow the draft as it's typed, clearing once it's fixed.
  const [showErrors, setShowErrors] = useState(restored !== undefined);
  // The message of a value left in the cell, shown while the user is elsewhere.
  const [keptMessage, setKeptMessage] = useState(restored?.message);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);

  const rules = resolveNumberRules(col, row);
  const baselineText = rules
    ? toNumberEditText(toNumberValue(current))
    : (toTextValue(current) ?? "");
  const text = draft ?? baselineText;
  const dirty = draft !== null && draft !== baselineText;

  // A cell mid-edit counts as unsaved, so leaving the page asks first.
  useEffect(() => {
    store.setEditing(cellId, focused && dirty);
  }, [store, cellId, focused, dirty]);
  useEffect(() => () => store.setEditing(cellId, false), [store, cellId]);

  const evaluate = (value: string): DraftEvaluation<unknown> => {
    const check = (parsed: unknown) => validate?.(parsed, row);
    return rules
      ? evaluateNumberDraft(normalizeNumberText(value), rules, check)
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

  const evaluation = draft === null ? null : evaluate(draft);
  const error =
    draft !== null && evaluation && !isUnchanged(draft, evaluation) ? evaluation.error : null;
  const liveMessage = error && showErrors ? describe(error) : undefined;
  const message = focused ? liveMessage : keptMessage;
  const kept = !focused && keptMessage !== undefined;

  const revert = () => {
    setDraft(null);
    setShowErrors(false);
    setKeptMessage(undefined);
    store.setKept(cellId, undefined);
  };

  // Commits the draft if it changed and passes every rule. Returns the message
  // of the rule that blocks the save, or `null` when focus may leave the cell.
  const commitDraft = (): string | null => {
    const draftText = draftRef.current;
    if (draftText === null) return null;
    const result = evaluate(draftText);
    if (isUnchanged(draftText, result)) {
      revert();
      return null;
    }
    if (result.error) {
      setShowErrors(true);
      return describe(result.error);
    }
    revert();
    save(result.value);
    return null;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  // Full-width digits typed through an IME read back as plain digits.
  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    if (rules) setDraft(normalizeNumberText(event.currentTarget.value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // While an IME is composing, Enter confirms the conversion, not the cell.
    if (event.nativeEvent.isComposing || composingRef.current || event.keyCode === 229) return;
    const from = { rowKey, colKey };
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (commitDraft() === null) navigation.move(from, event.shiftKey ? "up" : "down");
        return;
      case "Tab":
        if (commitDraft() !== null) {
          event.preventDefault();
          return;
        }
        // At the first / last editable cell, native Tab leaves the table.
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      case "Escape":
        if (draftRef.current === null || (!dirty && keptMessage === undefined)) return;
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

  // Leaving the cell saves a valid change. A value that breaks a rule is kept —
  // marked, with its message — instead of being quietly thrown away.
  const handleBlur = () => {
    setFocused(false);
    const blocked = commitDraft();
    if (blocked === null) return;
    setKeptMessage(blocked);
    store.setKept(cellId, { value: draftRef.current, message: blocked });
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

  const hint = focused ? t("editRevertHint") : t("editKeptHint");

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={focused || kept ? "focused" : "forced-colors"}
      icon={<Pencil />}
      errorId={errorId}
      description={message === undefined ? undefined : `${message}. ${hint}`}
    >
      <Tooltip.Root open={message !== undefined && (focused || hovered)}>
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
                !focused && !kept && "astw:text-transparent",
                rules && "astw:tabular-nums",
                align === "right" && "astw:text-right",
                ruleClassName(message, focused),
              )}
              style={focused ? { WebkitTouchCallout: "default" } : undefined}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={handleCompositionEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onContextMenu={stopWhileFocused}
              onTouchStart={stopWhileFocused}
            />
          }
        />
        <Tooltip.Content>
          {message}
          <span className="astw:block astw:opacity-70">{hint}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </EditableCellFrame>
  );
}

// ── Shared by the dropdown and calendar editors ─────────────────────────────

/**
 * Validates and commits a picked value. A pick the consumer's `validate`
 * rejects is kept on screen, marked, with its message — like a typed value
 * that breaks a rule — until the user picks again or presses Esc. Picking the
 * current value is a no-op (and drops a rejected pick).
 */
function usePickCommit<TRow extends Record<string, unknown>>(
  row: TRow,
  col: EditableColumn<TRow>,
  save: (value: unknown) => void,
  isSame: (next: string | null) => boolean,
  store: CellEditStore,
  cellId: string,
) {
  const [rejected, setRejected] = useState<KeptDraft | undefined>(() => store.getKept(cellId));
  const clear = () => {
    setRejected(undefined);
    store.setKept(cellId, undefined);
  };
  // Returns whether the pick went through.
  const commit = (next: string | null): boolean => {
    if (isSame(next)) {
      clear();
      return true;
    }
    if (next === null && col.edit?.required) return false;
    const problem = (col.edit?.validate as CellValidate<TRow>)?.(next, row);
    if (problem) {
      const kept = { value: next, message: problem };
      setRejected(kept);
      store.setKept(cellId, kept);
      return false;
    }
    clear();
    save(next);
    return true;
  };
  return { rejected, clear, commit };
}

// Tab / Shift+Tab from a closed calendar moves between editable cells, the
// same way it does from a typing cell.
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

/** One dropdown choice; `value: null` is "None". */
interface Choice {
  value: string | null;
  label: string;
}

// Case-, width- and accent-insensitive enough for searching labels: full-width
// letters and half-width katakana match their usual forms.
const searchable = (text: string) => text.normalize("NFKC").toLocaleLowerCase().trim();

const matchesQuery = (label: string, query: string) =>
  searchable(label).includes(searchable(query));

const isChoiceEqual = (a: Choice, b: Choice) => a.value === b.value;

const choiceLabel = (choice: Choice) => choice.label;

function ChoiceEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  align,
  navigation,
  store,
  cellProps,
}: DataTableEditableCellProps<TRow, ChoiceColumn<TRow>>) {
  const t = useDataTableT();
  const errorId = useId();
  const cellId = cellEditId(rowKey, colKey);
  const { current, display, save } = useCellCommit(row, col, store);
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);
  const value = toTextValue(current);
  const { rejected, clear, commit } = usePickCommit(
    row,
    col,
    save,
    (next) => next === value,
    store,
    cellId,
  );
  const required = col.edit?.required === true;
  const noneLabel = t("editNone");
  const choices = columnChoices(col);
  // Keyed on content: columns are often rebuilt every render, and a new list
  // would reset the combobox's highlight mid-search.
  const choicesKey = (choices ?? []).map((c) => `${c.value}\u0000${c.label}`).join("\u0001");
  const items = useMemo<Choice[]>(
    () => [
      ...(required ? [] : [{ value: null, label: noneLabel }]),
      ...(choices ?? []).map((c) => ({ value: c.value, label: String(c.label) })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `choicesKey` stands for `choices`.
    [choicesKey, required, noneLabel],
  );

  const shown = rejected ? (rejected.value as string | null) : value;
  const selected = items.find((item) => item.value === shown) ?? null;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  // What the user has typed to search; `null` while the input just shows the
  // current choice (and the list shows every choice).
  const [query, setQueryState] = useState<string | null>(null);
  // Read by handlers that run before the next render: closing the list on an
  // outside press happens before the input's blur.
  const queryRef = useRef<string | null>(null);
  const setQuery = (next: string | null) => {
    queryRef.current = next;
    setQueryState(next);
  };
  // The search the list is filtered by. It outlives the input's text until the
  // list has finished closing, so a closing list doesn't flash every choice.
  const [listQuery, setListQuery] = useState<string | null>(null);
  const highlightedRef = useRef<Choice | undefined>(undefined);
  const selectOnMouseUpRef = useRef(false);
  const from = { rowKey, colKey };

  const filtered = listQuery ? items.filter((item) => matchesQuery(item.label, listQuery)) : items;
  const message = rejected?.message;
  const cellDisplay = rejected
    ? renderTypedValue(row, col, rejected.value, { linkAsText: true })
    : display;

  const pick = (item: Choice | null): boolean => {
    setQuery(null);
    return commit(item?.value ?? null);
  };

  // A name typed in full counts as picking it when the user moves on.
  const pickTypedMatch = () => {
    const typed = queryRef.current;
    if (!typed) return;
    const exact = items.find((item) => searchable(item.label) === searchable(typed));
    if (exact) pick(exact);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    switch (event.key) {
      case "Enter":
        // Base UI picks the highlighted choice (see `onValueChange`).
        if (open && highlightedRef.current) return;
        event.preventDefault();
        setOpen(false);
        setQuery(null);
        if (!rejected) navigation.move(from, event.shiftKey ? "up" : "down");
        return;
      case "Tab": {
        // Typing a few letters and pressing Tab takes the highlighted match.
        const match = open && query ? highlightedRef.current : undefined;
        setOpen(false);
        setQuery(null);
        if ((match && !pick(match)) || (!match && rejected)) {
          event.preventDefault();
          return;
        }
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      }
      case "Escape":
        // An open list closes first (Base UI); a second Esc drops a rejected pick.
        if (open || !rejected) return;
        event.preventDefault();
        event.stopPropagation();
        clear();
        return;
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setQuery(null);
    setListQuery(null);
    event.currentTarget.select();
  };

  const handleBlur = () => {
    setFocused(false);
    pickTypedMatch();
    setQuery(null);
    setOpen(false);
  };

  const handleMouseDown = (event: MouseEvent<HTMLInputElement>) => {
    if (focused) return;
    if (event.button === 2) {
      event.preventDefault();
      return;
    }
    selectOnMouseUpRef.current = true;
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (!selectOnMouseUpRef.current) return;
    selectOnMouseUpRef.current = false;
    event.preventDefault();
  };

  const renderChoice = (item: Choice) => {
    if (item.value === null)
      return <span className="astw:text-muted-foreground">{item.label}</span>;
    if (col.type !== "badge") return item.label;
    return (
      <BadgeList value={item.value} options={col.typeOptions} resolveLabel={() => item.label} />
    );
  };

  const hint = focused ? t("editRevertHint") : t("editKeptHint");

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={cellDisplay}
      truncate={col.truncate}
      hideDisplay={focused ? "focused" : "forced-colors"}
      icon={<ChevronDown />}
      errorId={errorId}
      description={message === undefined ? undefined : `${message}. ${hint}`}
    >
      <BaseCombobox.Root<Choice>
        items={items}
        filteredItems={filtered}
        value={selected}
        onValueChange={(item, details) => {
          // Only an explicit pick (click, or Enter on a highlighted choice)
          // changes the value; clearing the search text doesn't.
          if (details.reason !== "item-press") return;
          const picked = pick(item);
          setOpen(false);
          // Enter picks and moves down the column, like every other cell.
          const { event } = details;
          if (picked && event instanceof KeyboardEvent && event.key === "Enter") {
            const direction = event.shiftKey ? "up" : "down";
            requestAnimationFrame(() => navigation.move(from, direction));
          }
        }}
        inputValue={query ?? selected?.label ?? ""}
        onInputValueChange={(next, details) => {
          if (details.reason === "input-change" || details.reason === "input-clear") {
            setQuery(next);
            setListQuery(next);
          }
        }}
        open={open}
        onOpenChange={(next, details) => {
          setOpen(next);
          if (next) {
            // Opened by a click or arrow key rather than by typing: every choice.
            if (details.reason !== "input-change") setListQuery(null);
            return;
          }
          // Esc abandons the search, and a clicked choice was already picked.
          if (details.reason !== "escape-key" && details.reason !== "item-press") {
            pickTypedMatch();
          }
          setQuery(null);
        }}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setListQuery(null);
        }}
        onItemHighlighted={(item) => {
          highlightedRef.current = item ?? undefined;
        }}
        autoHighlight
        itemToStringLabel={choiceLabel}
        isItemEqualToValue={isChoiceEqual}
      >
        <Tooltip.Root open={message !== undefined && (focused || hovered) && !open}>
          <Tooltip.Trigger
            render={
              <ComboboxParts.Input
                ref={register}
                aria-label={label}
                aria-invalid={message !== undefined ? true : undefined}
                aria-describedby={message !== undefined ? errorId : undefined}
                autoComplete="off"
                enterKeyHint="next"
                className={cn(
                  INPUT_CLASS_NAME,
                  // A dropdown at rest: a pointer. Once in it, a caret to search.
                  !focused && "astw:text-transparent astw:cursor-pointer",
                  align === "right" && "astw:text-right",
                  ruleClassName(message, focused),
                )}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
              />
            }
          />
          <Tooltip.Content>
            {message}
            <span className="astw:block astw:opacity-70">{hint}</span>
          </Tooltip.Content>
        </Tooltip.Root>
        {/* At least as wide as the cell, and wide enough that choices don't wrap. */}
        <ComboboxParts.Content className="astw:w-max astw:min-w-(--anchor-width) astw:max-w-80">
          <ComboboxParts.Empty>{t("editNoMatches")}</ComboboxParts.Empty>
          <ComboboxParts.List>
            {(item: Choice) => (
              <ComboboxParts.Item key={item.value ?? "\u0000none"} value={item}>
                {renderChoice(item)}
              </ComboboxParts.Item>
            )}
          </ComboboxParts.List>
        </ComboboxParts.Content>
      </BaseCombobox.Root>
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
  store,
  cellProps,
}: DataTableEditableCellProps<TRow, DateColumn<TRow>>) {
  const t = useDataTableT();
  const errorId = useId();
  const cellId = cellEditId(rowKey, colKey);
  const withTime = col.typeOptions?.dateFormat === "datetime";
  const { current, display, save } = useCellCommit(row, col, store);
  const register = useNavigationRef<HTMLButtonElement>(navigation, rowKey, colKey);
  const { rejected, clear, commit } = usePickCommit(
    row,
    col,
    save,
    (next) => sameDate(next, current, withTime),
    store,
    cellId,
  );
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  // A date-time is picked in two steps (day, then time), so it's committed when
  // the calendar closes; a date commits as soon as a day is picked.
  const [draftDay, setDraftDay] = useState<CalendarDate | null>(null);
  const [draftTime, setDraftTime] = useState("");
  const shown = rejected ? rejected.value : current;
  const cellDisplay = rejected
    ? renderTypedValue(row, col, rejected.value, { linkAsText: true })
    : display;
  const message = rejected?.message;
  // The trigger has no text of its own (the date is the cell's display, hidden
  // from screen readers), so its accessible name carries the date.
  const accessibleName = typeof cellDisplay === "string" ? `${label}, ${cellDisplay}` : label;
  const min = isIsoDate(col.edit?.min) ? parseDate(col.edit.min) : undefined;
  const max = isIsoDate(col.edit?.max) ? parseDate(col.edit.max) : undefined;
  const pickedDay = withTime ? draftDay : toCalendarDate(shown);

  const handleOpenChange = (next: boolean, details?: { reason?: string }) => {
    if (next) {
      setDraftDay(toCalendarDate(shown));
      setDraftTime(toTimeText(shown));
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

  const hint = focused ? t("editRevertHint") : t("editKeptHint");

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={cellDisplay}
      truncate={col.truncate}
      icon={<CalendarDays />}
      errorId={errorId}
      description={message === undefined ? undefined : `${message}. ${hint}`}
    >
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Tooltip.Root open={message !== undefined && (focused || hovered) && !open}>
          <Tooltip.Trigger
            render={
              <Popover.Trigger
                ref={register}
                aria-label={accessibleName}
                aria-invalid={message !== undefined ? true : undefined}
                aria-describedby={message !== undefined ? errorId : undefined}
                className={cn(TRIGGER_CLASS_NAME, ruleClassName(message, focused))}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && !open) {
                    event.preventDefault();
                    handleOpenChange(true);
                    return;
                  }
                  if (event.key === "Escape" && !open && rejected) {
                    event.preventDefault();
                    event.stopPropagation();
                    clear();
                    return;
                  }
                  // A rejected pick holds focus until it's fixed or undone.
                  if (event.key === "Tab" && rejected) {
                    event.preventDefault();
                    return;
                  }
                  tabBetweenCells(event, open, navigation, { rowKey, colKey });
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
              />
            }
          />
          <Tooltip.Content>
            {message}
            <span className="astw:block astw:opacity-70">{hint}</span>
          </Tooltip.Content>
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
