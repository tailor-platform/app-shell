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
import { cn } from "@/lib/utils";
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
  isAllowedNumberText,
  isLiveError,
  isPromiseLike,
  normalizeNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
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
  { type: "text" | "number" | "money" | "link" }
>;

/**
 * Whether the column carries an `edit` config on a type that supports it.
 *
 * @internal
 */
export function isEditableColumn<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
): col is EditableColumn<TRow> {
  if (col.edit === undefined) return false;
  return (
    col.type === "text" || col.type === "number" || col.type === "money" || col.type === "link"
  );
}

// The editor sits over the cell's static content (the sizer) instead of taking
// part in layout, so a cell becoming editable — or being edited — never
// changes row height or column width. Reaching 6px past the content on every
// side leaves the 2px focus ring inside the cell's 8px padding.
const EDITOR_CLASS_NAME = cn(
  "astw:absolute astw:-top-1.5 astw:-left-1.5 astw:h-[calc(100%+0.75rem)] astw:w-[calc(100%+0.75rem)]",
  "astw:rounded-sm astw:px-[5px] astw:py-0 astw:shadow-none astw:bg-transparent astw:dark:bg-transparent",
  "astw:border-input/60 astw:hover:border-input astw:focus-visible:ring-2",
);

interface PendingCommit<TRow> {
  id: number;
  value: unknown;
  /** The row object the save was made against. */
  row: TRow;
  settled: boolean;
}

type CellValidate<TRow> = ((value: unknown, row: TRow) => string | null | undefined) | undefined;

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

interface DataTableEditableCellProps<TRow extends Record<string, unknown>> {
  row: TRow;
  col: EditableColumn<TRow>;
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
 * A body cell whose value can be typed over in place (`text`, `number`,
 * `money`, `link`). The value belongs to the consumer: the cell only holds a
 * draft while it is focused, and hands the parsed value to `edit.onCommit`
 * when the user leaves the cell or presses Enter / Tab.
 *
 * @internal
 */
export function DataTableEditableCell<TRow extends Record<string, unknown>>({
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
  const [pending, setPending] = useState<PendingCommit<TRow> | null>(null);
  const commitIdRef = useRef(0);
  const pastingRef = useRef(false);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // A save still in flight — or settled but not yet reflected in `data` — keeps
  // showing its value. Fresh data for the row (a new row object) supersedes it.
  const inFlight = pending && (!pending.settled || pending.row === row) ? pending : null;
  const current = inFlight ? inFlight.value : getCellValue(row, col);

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

  const save = (value: unknown) => {
    const id = ++commitIdRef.current;
    const returned = (edit?.onCommit as ((row: TRow, value: unknown) => unknown) | undefined)?.(
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

  const registerInput = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (!element) return;
      const unregister = navigation.register(rowKey, colKey, element);
      return () => {
        inputRef.current = null;
        unregister();
      };
    },
    [navigation, rowKey, colKey],
  );

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

  let display: ReactNode;
  if (inFlight) display = renderTypedValue(row, col, inFlight.value, { linkAsText: true });
  else if (col.render) display = col.render(row);
  else display = renderTypedValue(row, col, current, { linkAsText: true });

  return (
    <Table.Cell
      {...cellProps}
      // Editing a cell must never fire `onClickRow`.
      onClick={(event) => event.stopPropagation()}
      // A click in the cell's padding, outside the editor, still starts editing.
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || event.button !== 0) return;
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <span data-slot="data-table-cell-editor" className="astw:relative astw:block">
        <span
          aria-hidden="true"
          className={cn(
            "astw:block astw:forced-colors:invisible",
            col.truncate && "astw:truncate",
            focused && "astw:invisible",
          )}
        >
          {display}
        </span>
        <Tooltip.Root open={focused && message !== undefined}>
          <Tooltip.Trigger
            render={
              <Input
                ref={registerInput}
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
                  EDITOR_CLASS_NAME,
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
        {message !== undefined && (
          <span id={errorId} className="astw:sr-only">
            {`${message}. ${t("editRevertHint")}`}
          </span>
        )}
      </span>
    </Table.Cell>
  );
}
