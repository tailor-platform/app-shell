import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isComposing } from "@/lib/is-composing";
import { BadgeList } from "@/components/badge-list";
import { ComboboxParts } from "@/components/combobox";
import { toTextValue } from "../cell-values";
import { useDataTableT } from "../i18n";
import { useCellEditSession } from "./use-session";
import {
  CELL_ERROR_CLASS_NAME,
  ICON_INPUT_CLASS_NAME,
  INPUT_CLASS_NAME,
  EditableCellFrame,
  columnChoices,
  useCellValue,
  useNavigationRef,
  type EditableColumn,
  type DataTableEditableCellProps,
} from "./shared";

type ChoiceColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "text" | "link" | "badge" }
>;

/** One dropdown choice; `value: null` is "None". */
interface Choice {
  value: string | null;
  label: string;
}

type ChoiceDraft = Choice & { notified?: boolean };

// Case- and width-insensitive searching: full-width letters and half-width
// katakana match their usual forms.
const searchable = (text: string) => text.normalize("NFKC").toLocaleLowerCase().trim();

const isChoiceEqual = (a: Choice, b: Choice) => a.value === b.value;

const choiceLabel = (choice: Choice) => choice.label;

export function ChoiceEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  align,
  navigation,
  cellProps,
  tooltipLabel,
}: DataTableEditableCellProps<TRow, ChoiceColumn<TRow>>) {
  const t = useDataTableT();
  const session = useCellEditSession<ChoiceDraft>(col.edit?.error !== false);
  const { state } = session;
  const { current, display, change, commit, callbackError, containsErrorTarget } = useCellValue(
    row,
    col,
    state.status === "failed" ? state : undefined,
  );
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);
  const value = toTextValue(current);
  const noneLabel = t("editNone");
  const choices = columnChoices(col);
  // Keyed on content: rebuilding columns must not reset the highlight mid-search.
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
  const editing = state.status !== "idle";
  const activeChoice = state.status === "idle" ? selected : state.draft;
  // The displayed search text is local while editing, even if consumer data changes.
  const [query, setQuery] = useState<string | null>(null);
  // Keep the closing list filtered until its animation completes.
  const [listQuery, setListQuery] = useState<string | null>(null);
  const highlightedRef = useRef<Choice | undefined>(undefined);
  const explicitHighlightRef = useRef<Choice | undefined>(undefined);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);
  const from = { rowKey, colKey };

  const filtered = useMemo(() => {
    const search = searchable(listQuery ?? "");
    if (!search) return items;
    const rank = (item: Choice) => {
      const text = searchable(item.label);
      if (text === search) return 0;
      return text.startsWith(search) ? 1 : 2;
    };
    return (
      items
        .filter((item) => item.value !== null && searchable(item.label).includes(search))
        // Sorting is stable, preserving the original order within each rank.
        .toSorted((left, right) => rank(left) - rank(right))
    );
  }, [items, listQuery]);

  const startEditing = () => {
    session.begin(selected ?? { value, label: value ?? noneLabel });
    setQuery(selected?.label ?? "");
    setListQuery(null);
    highlightedRef.current = undefined;
    explicitHighlightRef.current = undefined;
  };

  const closeEditor = () => {
    setQuery(null);
    explicitHighlightRef.current = undefined;
    setOpen(false);
  };

  const cancelEditing = () => {
    const active = session.getState();
    session.cancel(
      active.status !== "idle" && active.draft.notified && active.draft.value !== value
        ? () => change(value)
        : undefined,
    );
    closeEditor();
  };

  const leaveEditor = () => {
    const active = session.getState();
    if (active.status === "failed" || active.status === "confirming") closeEditor();
    else cancelEditing();
  };

  const pick = (item: Choice) => {
    const active = session.getState();
    if (active.status === "confirming" && active.draft.value === item.value) return;
    session.change(
      { ...item, notified: item.value !== value },
      item.value !== value ? () => change(item.value) : undefined,
    );
    setQuery(item.label);
    session.confirm(() => (item.value !== value ? commit(item.value) : undefined), closeEditor);
  };

  const explicitCandidate = () => {
    const item = explicitHighlightRef.current;
    return item && filtered.includes(item) ? item : undefined;
  };

  const keyboardCandidate = () => {
    const highlighted = highlightedRef.current;
    return (
      explicitCandidate() ??
      (highlighted && filtered.includes(highlighted) ? highlighted : filtered[0])
    );
  };

  const handleKeyDown: NonNullable<ComponentProps<typeof ComboboxParts.Input>["onKeyDown"]> = (
    event,
  ) => {
    if (isComposing(event.nativeEvent, composingRef.current)) {
      event.preventBaseUIHandler();
      return;
    }
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        event.preventBaseUIHandler();
        const active = session.getState();
        if (active.status === "confirming") return;
        if (!open) {
          if (active.status === "failed" && active.source === "commit") {
            session.confirm(
              () => (active.draft.value !== value ? commit(active.draft.value) : undefined),
              closeEditor,
            );
            return;
          }
          if (active.status === "idle") startEditing();
          setOpen(true);
          return;
        }
        const item = keyboardCandidate();
        if (item) pick(item);
        else leaveEditor();
        return;
      }
      case "Tab": {
        event.preventBaseUIHandler();
        const item =
          session.getState().status !== "idle" && open
            ? (explicitCandidate() ??
              (searchable(listQuery ?? "") ? keyboardCandidate() : undefined))
            : undefined;
        if (item) pick(item);
        else leaveEditor();
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      }
      case "Escape":
        if (session.getState().status === "idle" && !open) return;
        event.preventDefault();
        event.stopPropagation();
        event.preventBaseUIHandler();
        cancelEditing();
        return;
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    const withinCell = focused || containsErrorTarget(event.relatedTarget);
    setFocused(true);
    if (withinCell) return;
    if (session.getState().status === "idle") startEditing();
    event.currentTarget.select();
  };

  const handleBlur = () => {
    setFocused(false);
    leaveEditor();
  };

  const handleMouseDown = (event: MouseEvent<HTMLInputElement>) => {
    if (event.button === 2 && session.getState().status === "idle") {
      event.preventDefault();
      return;
    }
    if (session.getState().status === "idle") {
      startEditing();
      setOpen(true);
    }
    if (!focused) selectOnMouseUpRef.current = true;
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (!selectOnMouseUpRef.current) return;
    selectOnMouseUpRef.current = false;
    event.preventDefault();
  };

  const stopWhileEditing = (event: MouseEvent | TouchEvent) => {
    if (session.getState().status !== "idle") event.stopPropagation();
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
      hideDisplay={editing ? "focused" : "forced-colors"}
      icon={<ChevronDown />}
      tooltipLabel={tooltipLabel}
      editing={editing}
      callbackError={callbackError}
      label={label}
      onEditorLeave={handleBlur}
      onEditorCancel={cancelEditing}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      <BaseCombobox.Root<Choice>
        items={items}
        filteredItems={filtered}
        value={activeChoice}
        onValueChange={(item, details) => {
          if (details.reason === "item-press" && item) pick(item);
        }}
        inputValue={query ?? activeChoice?.label ?? ""}
        onInputValueChange={(next, details) => {
          if (details.reason === "input-change" || details.reason === "input-clear") {
            const active = session.getState();
            session.change(
              active.status === "idle"
                ? (selected ?? { value, label: value ?? noneLabel })
                : active.draft,
            );
            setQuery(next);
            setListQuery(next);
            explicitHighlightRef.current = undefined;
          }
        }}
        open={open}
        onOpenChange={(next, details) => {
          if (next) {
            if (session.getState().status === "idle") startEditing();
            setOpen(true);
            if (details.reason !== "input-change") setListQuery(null);
            return;
          }
          if (
            containsErrorTarget(details.event.target) ||
            ("relatedTarget" in details.event &&
              containsErrorTarget(details.event.relatedTarget as EventTarget | null))
          ) {
            details.cancel();
            return;
          }
          // Clearing search text is not selection or cancellation.
          if (details.reason === "input-clear") {
            setOpen(false);
            return;
          }
          if (details.reason === "escape-key") cancelEditing();
          else leaveEditor();
        }}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setListQuery(null);
        }}
        onItemHighlighted={(item, details) => {
          // Hover is visual feedback, not a keyboard confirmation candidate.
          if (details.reason === "pointer") return;
          highlightedRef.current = item;
          if (item && details.reason === "keyboard") explicitHighlightRef.current = item;
        }}
        autoHighlight
        itemToStringLabel={choiceLabel}
        isItemEqualToValue={isChoiceEqual}
      >
        <ComboboxParts.Input
          ref={register}
          aria-label={label}
          aria-invalid={callbackError ? true : undefined}
          aria-describedby={callbackError?.id}
          aria-keyshortcuts={callbackError ? "Alt+ArrowDown" : undefined}
          autoComplete="off"
          enterKeyHint="done"
          readOnly={!editing}
          className={cn(
            INPUT_CLASS_NAME,
            ICON_INPUT_CLASS_NAME,
            !editing && "astw:text-transparent astw:cursor-pointer",
            align === "right" && "astw:text-right",
            callbackError && CELL_ERROR_CLASS_NAME,
          )}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={stopWhileEditing}
          onTouchStart={stopWhileEditing}
          style={editing ? { WebkitTouchCallout: "default" } : undefined}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
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
