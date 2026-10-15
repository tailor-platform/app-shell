import {
  useCallback,
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
import type { CalendarDate } from "@internationalized/date";
import { CalendarDays, ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeZone } from "@/contexts/appshell-context";
import { BadgeList } from "@/components/badge-list";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { ComboboxParts } from "@/components/combobox";
import { Input } from "@/components/input";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import type { Column } from "./types";
import { getCellValue, renderTypedValue } from "./cell-renderers";
import {
  normalizeNumberText,
  parseNumberText,
  resolveBadgeOptions,
  sameDate,
  sameNumber,
  toCalendarDate,
  toIsoDateTime,
  toNumberEditText,
  toNumberValue,
  toTextValue,
  toTimeText,
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

// Only malformed numeric input is handled here; business errors belong to the consumer.
const CELL_ERROR_CLASS_NAME =
  "astw:ring-2 astw:ring-inset astw:ring-destructive astw:focus:ring-destructive astw:focus-visible:ring-destructive";

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

function useCellValue<TRow extends Record<string, unknown>>(row: TRow, col: EditableColumn<TRow>) {
  const { value: timeZone } = useTimeZone();
  const current = getCellValue(row, col);
  const display = col.render
    ? col.render(row)
    : renderTypedValue(row, col, current, { linkAsText: true, timeZone });
  const change = (value: unknown) => {
    (col.edit?.onValueChange as ((row: TRow, value: unknown) => void) | undefined)?.(row, value);
  };
  return { current, display, change };
}

/**
 * Registers the cell's focusable element with the table's Tab
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
  children,
}: {
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  truncate?: boolean;
  /** Typed-into cells hide the display while the input shows the text. */
  hideDisplay?: "focused" | "forced-colors";
  /** Shown on hover or focus; the column header marks editability at rest. */
  icon: ReactNode;
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
    </Table.Cell>
  );
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
 * consumer: the cell only holds a draft while it is being edited, and notifies
 * `edit.onValueChange` when the user leaves the cell, presses Enter / Tab, or
 * picks a choice. Validation and persistence belong to the consumer.
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
  cellProps,
}: DataTableEditableCellProps<TRow>) {
  const t = useDataTableT();
  const errorId = useId();
  const { current, display, change } = useCellValue(row, col);
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);

  const [draft, setDraftState] = useState<string | null>(null);
  // Read by handlers that run before the next render: the blur fired by moving
  // focus right after Enter must see that Enter already committed the draft.
  const draftRef = useRef(draft);
  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showParseError, setShowParseError] = useState(false);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);

  const numeric = col.type === "number" || col.type === "money";
  const baselineText = numeric
    ? toNumberEditText(toNumberValue(current))
    : (toTextValue(current) ?? "");
  const text = draft ?? baselineText;
  const dirty = draft !== null && draft !== baselineText;
  const malformed =
    numeric && draft !== null && parseNumberText(normalizeNumberText(draft)) === undefined;
  const message = showParseError && malformed ? t("editNotANumber") : undefined;

  const revert = () => {
    setDraft(null);
    setShowParseError(false);
  };

  // Clear the draft before notifying: moving focus immediately fires blur.
  const commitDraft = (): boolean => {
    const draftText = draftRef.current;
    if (draftText === null) return true;
    const value = numeric
      ? parseNumberText(normalizeNumberText(draftText))
      : toTextValue(draftText);
    if (value === undefined) {
      setShowParseError(true);
      return false;
    }
    const unchanged =
      draftText === baselineText ||
      (numeric
        ? sameNumber(value as number | null, toNumberValue(current))
        : value === toTextValue(current));
    revert();
    if (!unchanged) change(value);
    return true;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  // Full-width digits typed through an IME read back as plain digits.
  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    if (numeric) setDraft(normalizeNumberText(event.currentTarget.value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // While an IME is composing, Enter confirms the conversion, not the cell.
    if (event.nativeEvent.isComposing || composingRef.current || event.keyCode === 229) return;
    const from = { rowKey, colKey };
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        commitDraft();
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
        if (draftRef.current === null || !dirty) return;
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

  // Malformed text cannot be emitted as a number; blur restores consumer data.
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

  const hint = t("editRevertHint");

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={focused ? "focused" : "forced-colors"}
      icon={<Pencil />}
    >
      {message !== undefined && (
        <span id={errorId} className="astw:sr-only">
          {message}. {hint}
        </span>
      )}
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
              inputMode={numeric ? "text" : undefined}
              enterKeyHint="done"
              autoComplete="off"
              spellCheck={numeric ? false : undefined}
              className={cn(
                INPUT_CLASS_NAME,
                !focused && "astw:text-transparent",
                numeric && "astw:tabular-nums",
                align === "right" && "astw:text-right",
                message !== undefined && CELL_ERROR_CLASS_NAME,
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
  cellProps,
}: DataTableEditableCellProps<TRow, ChoiceColumn<TRow>>) {
  const t = useDataTableT();
  const { current, display, change } = useCellValue(row, col);
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);
  const value = toTextValue(current);
  const noneLabel = t("editNone");
  const choices = columnChoices(col);
  // Keyed on content: columns are often rebuilt every render, and a new list
  // would reset the combobox's highlight mid-search.
  const choicesKey = (choices ?? []).map((c) => `${c.value}\u0000${c.label}`).join("\u0001");
  const items = useMemo<Choice[]>(
    () => [
      { value: null, label: noneLabel },
      ...(choices ?? []).map((c) => ({ value: c.value, label: String(c.label) })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `choicesKey` stands for `choices`.
    [choicesKey, noneLabel],
  );

  const selected = items.find((item) => item.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
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
  const pick = (item: Choice | null) => {
    setQuery(null);
    const next = item?.value ?? null;
    if (next !== value) change(next);
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
        return;
      case "Tab": {
        // Typing a few letters and pressing Tab takes the highlighted match.
        const match = open && query ? highlightedRef.current : undefined;
        setOpen(false);
        setQuery(null);
        if (match) pick(match);
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      }
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

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={focused ? "focused" : "forced-colors"}
      icon={<ChevronDown />}
    >
      <BaseCombobox.Root<Choice>
        items={items}
        filteredItems={filtered}
        value={selected}
        onValueChange={(item, details) => {
          // Only an explicit pick (click, or Enter on a highlighted choice)
          // changes the value; clearing the search text doesn't.
          if (details.reason !== "item-press") return;
          pick(item);
          setOpen(false);
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
        <ComboboxParts.Input
          ref={register}
          aria-label={label}
          autoComplete="off"
          enterKeyHint="done"
          className={cn(
            INPUT_CLASS_NAME,
            // A dropdown at rest: a pointer. Once in it, a caret to search.
            !focused && "astw:text-transparent astw:cursor-pointer",
            align === "right" && "astw:text-right",
          )}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
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
  const { value: timeZone } = useTimeZone();
  const withTime = col.typeOptions?.dateFormat === "datetime";
  const { current, display, change } = useCellValue(row, col);
  const register = useNavigationRef<HTMLButtonElement>(navigation, rowKey, colKey);
  const commit = (next: string | null) => {
    if (!sameDate(next, current, withTime, timeZone)) change(next);
  };
  const [open, setOpen] = useState(false);
  // A date-time is picked in two steps (day, then time), so it's committed when
  // the calendar closes; a date commits as soon as a day is picked.
  const [draftDay, setDraftDay] = useState<CalendarDate | null>(null);
  const [draftTime, setDraftTime] = useState("");
  // The trigger's accessible name carries the date hidden in the visual display.
  const accessibleName = typeof display === "string" ? `${label}, ${display}` : label;
  const pickedDay = withTime ? draftDay : toCalendarDate(current, timeZone);

  const handleOpenChange = (next: boolean, details?: { reason?: string }) => {
    if (next) {
      setDraftDay(toCalendarDate(current, timeZone));
      setDraftTime(toTimeText(current, timeZone));
    } else if (withTime && draftDay && details?.reason !== "escape-key") {
      commit(toIsoDateTime(draftDay, draftTime, timeZone));
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
      icon={<CalendarDays />}
    >
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          ref={register}
          aria-label={accessibleName}
          className={TRIGGER_CLASS_NAME}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              handleOpenChange(true);
              return;
            }
            tabBetweenCells(event, open, navigation, { rowKey, colKey });
          }}
        />
        <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
          <Popover.Positioner sideOffset={4} side="bottom" align="start">
            <Popover.Popup data-slot="data-table-cell-calendar" className={POPUP_CLASS_NAME}>
              <Calendar
                aria-label={label}
                value={pickedDay}
                defaultFocusedValue={pickedDay ?? undefined}
                onChange={handlePick}
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
              <div className="astw:flex astw:justify-between astw:gap-2">
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
                {withTime && (
                  <Button size="sm" onClick={() => handleOpenChange(false)}>
                    {t("editDone")}
                  </Button>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </EditableCellFrame>
  );
}
