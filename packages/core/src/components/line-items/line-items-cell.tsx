import * as React from "react";

import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxRoot,
  ComboboxTrigger,
} from "@/components/combobox/combobox";
import { cn } from "@/lib/utils";
import { fieldCommitScope } from "./field";
import type {
  LineItemsField,
  LineItemsMode,
  LineItemsRowData,
  LineItemsSelectOption,
} from "./types";

/** Where a commit hands focus next. */
export type CellNavigation = "enter-down" | "enter-up" | "tab" | "shift-tab";

export type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/**
 * Editors are borderless and fill the cell, unlike the standalone `Input`
 * component (a bordered 36px control), which would break the grid's rhythm.
 * Every editable cell mounts its editor, so the grid reads as a spreadsheet at
 * rest — a text caret in text cells, a caret button in select cells.
 */
const editorClasses = cn(
  // `dark:bg-transparent` is not redundant: the wrapped input ships
  // `dark:bg-input/30`, and tailwind-merge only dedupes within one variant, so a
  // bare `bg-transparent` leaves the dark fill painted over the cell.
  "astw:h-full astw:min-h-0 astw:w-full astw:min-w-0 astw:flex-1 astw:border-0 astw:bg-transparent astw:dark:bg-transparent astw:px-2 astw:text-sm astw:leading-none astw:text-foreground",
  "astw:rounded-none astw:shadow-none astw:outline-none astw:ring-0",
  "astw:focus:outline-none astw:focus:shadow-none astw:focus:ring-0 astw:focus:border-transparent",
  "astw:focus-visible:outline-none astw:focus-visible:shadow-none astw:focus-visible:ring-0 astw:focus-visible:border-transparent",
);

/** The native number spinner has no room in a grid cell. */
const numberEditorClasses =
  "astw:[appearance:textfield] astw:[&::-webkit-outer-spin-button]:appearance-none astw:[&::-webkit-inner-spin-button]:appearance-none";

/** Native input type per field kind; anything else is plain text. */
const inputTypes: Record<string, string> = { number: "number", date: "date" };

const alignClasses = {
  left: "astw:text-left",
  center: "astw:text-center",
  right: "astw:text-right astw:tabular-nums",
} as const;

export type LineItemsCellProps<T extends LineItemsRowData> = {
  row: T;
  field: LineItemsField<T>;
  mode: LineItemsMode;
  align: "left" | "center" | "right";
  editable: boolean;
  /** Renders the fill handle — the active cell of a fillable column only. */
  showFillGrip: boolean;
  onCommit: (value: unknown) => void;
  /** Syncs the grid's active coordinate when an editor takes focus by any route. */
  onFocusCell: () => void;
  onNavigate: (to: CellNavigation) => void;
  /** Alt+Arrow moves the active cell without leaving the editor. */
  onArrowFromEditor: (key: ArrowKey, shift: boolean) => void;
  onFillGripPointerDown: (event: React.PointerEvent) => void;
};

function toEditorValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

const optionLabel = (o: LineItemsSelectOption): string =>
  o.description ? `${o.label} ${o.description}` : o.label;
const optionValue = (o: LineItemsSelectOption): string => o.value;

/** 6px square on the cell's bottom-right corner; drag it to fill down a column. */
function FillGrip({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <span
      data-slot="line-items-fill-grip"
      onPointerDown={onPointerDown}
      className="astw:absolute astw:-right-px astw:-bottom-px astw:z-[2] astw:size-1.5 astw:cursor-crosshair astw:bg-primary"
    />
  );
}

/**
 * A searchable select cell. Keeps the current value selectable even when it is
 * absent from `options`, so a value the catalogue no longer offers is never
 * silently dropped.
 */
function SelectCell<T extends LineItemsRowData>({
  field,
  value,
  onCommit,
  onFocusCell,
  onNavigate,
  onArrowFromEditor,
}: Pick<
  LineItemsCellProps<T>,
  "field" | "onCommit" | "onFocusCell" | "onNavigate" | "onArrowFromEditor"
> & { value: unknown }) {
  const type = field.type;
  const current = toEditorValue(value);

  const items = React.useMemo((): LineItemsSelectOption[] => {
    if (!type || type.kind !== "select") return [];
    const base = [...type.options];
    if (current && !base.some((o) => o.value === current)) {
      base.push({ value: current, label: current });
    }
    return base;
  }, [type, current]);

  if (!type || type.kind !== "select") return null;
  const selected = items.find((o) => o.value === current) ?? null;

  return (
    <ComboboxRoot<LineItemsSelectOption, false>
      items={items}
      value={selected}
      onValueChange={(next) => onCommit(next?.value ?? "")}
      itemToStringLabel={optionLabel}
      itemToStringValue={optionValue}
    >
      <ComboboxInputGroup className="astw:min-h-0 astw:flex-1 astw:items-stretch astw:border-0 astw:bg-transparent astw:dark:bg-transparent astw:shadow-none astw:ring-0 astw:focus-within:ring-0 astw:focus-within:[box-shadow:none]">
        <ComboboxInput
          data-slot="line-items-cell-editor"
          placeholder={type.placeholder}
          className={editorClasses}
          onFocus={(e) => {
            onFocusCell();
            e.currentTarget.select();
          }}
          onKeyDown={(e) => {
            if (e.altKey && isArrowKey(e.key)) {
              e.preventDefault();
              onArrowFromEditor(e.key, e.shiftKey);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              onNavigate("enter-down");
              return;
            }
            if (e.key === "Tab") {
              e.preventDefault();
              e.stopPropagation();
              onNavigate(e.shiftKey ? "shift-tab" : "tab");
            }
          }}
        />
        <ComboboxTrigger className="astw:relative astw:inset-y-auto astw:right-0 astw:shrink-0 astw:self-stretch astw:px-1" />
      </ComboboxInputGroup>
      <ComboboxContent>
        <ComboboxEmpty>No matches.</ComboboxEmpty>
        <ComboboxList>
          {(item: LineItemsSelectOption) => (
            <ComboboxItem key={item.value} value={item} className="astw:items-start astw:py-2">
              <div className="astw:flex astw:flex-col astw:gap-0.5">
                <span className="astw:text-sm astw:font-medium">{item.label}</span>
                {item.description ? (
                  <span className="astw:text-muted-foreground astw:text-xs">
                    {item.description}
                  </span>
                ) : null}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </ComboboxRoot>
  );
}

function isArrowKey(key: string): key is ArrowKey {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
}

/**
 * One grid cell's content.
 *
 * Edits are held locally and committed on blur or Enter, never per keystroke:
 * committing every character re-renders the grid and costs the input its focus
 * mid-word.
 */
function LineItemsCellInner<T extends LineItemsRowData>({
  row,
  field,
  mode,
  align,
  editable,
  showFillGrip,
  onCommit,
  onFocusCell,
  onNavigate,
  onArrowFromEditor,
  onFillGripPointerDown,
}: LineItemsCellProps<T>) {
  const rawValue = (row as Record<string, unknown>)[field.key];
  const [draft, setDraft] = React.useState(() => toEditorValue(rawValue));
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Reseed when the committed value changes underneath the editor (paste, fill,
  // revert), but never while the user is typing into it.
  React.useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setDraft(toEditorValue(rawValue));
  }, [rawValue]);

  const commit = React.useCallback(
    (next: string) => {
      if (next === toEditorValue(rawValue)) return;
      onCommit(next);
    },
    [onCommit, rawValue],
  );

  const grip = showFillGrip ? <FillGrip onPointerDown={onFillGripPointerDown} /> : null;

  if (!editable) {
    return (
      <>
        <span
          className={cn(
            "astw:flex astw:h-full astw:w-full astw:items-center astw:px-2",
            align === "right" && "astw:justify-end",
            align === "center" && "astw:justify-center",
            alignClasses[align],
          )}
        >
          {field.render(row)}
        </span>
        {grip}
      </>
    );
  }

  if (field.type?.kind === "custom") {
    return (
      <>
        <div className="astw:flex astw:h-full astw:w-full astw:items-center" onFocus={onFocusCell}>
          {field.type.renderEditor({
            value: rawValue,
            onCommit,
            onCancel: () => setDraft(toEditorValue(rawValue)),
            row,
            mode,
            field,
          })}
        </div>
        {grip}
      </>
    );
  }

  if (field.type?.kind === "select") {
    return (
      <>
        <div className="astw:flex astw:h-full astw:min-h-0 astw:w-full astw:flex-col">
          <SelectCell
            field={field}
            value={rawValue}
            onCommit={onCommit}
            onFocusCell={onFocusCell}
            onNavigate={onNavigate}
            onArrowFromEditor={onArrowFromEditor}
          />
        </div>
        {grip}
      </>
    );
  }

  if (field.type?.kind === "boolean") {
    return (
      <>
        <label
          aria-label={String(field.label)}
          className="astw:flex astw:h-full astw:w-full astw:cursor-pointer astw:items-center astw:justify-center"
        >
          <input
            type="checkbox"
            data-slot="line-items-cell-editor"
            checked={rawValue === true}
            onChange={(e) => onCommit(e.target.checked)}
            onFocus={onFocusCell}
            onKeyDown={(e) => {
              if (e.altKey && isArrowKey(e.key)) {
                e.preventDefault();
                onArrowFromEditor(e.key, e.shiftKey);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                onNavigate("enter-down");
                return;
              }
              if (e.key === "Tab") {
                e.preventDefault();
                onNavigate(e.shiftKey ? "shift-tab" : "tab");
              }
            }}
            className="astw:size-4 astw:accent-primary"
          />
        </label>
        {grip}
      </>
    );
  }

  const kind = field.type?.kind ?? "text";
  const isNumber = kind === "number";

  return (
    <>
      <input
        ref={inputRef}
        type={inputTypes[kind] ?? "text"}
        data-slot="line-items-cell-editor"
        value={draft}
        min={field.type?.kind === "date" ? field.type.min : undefined}
        max={field.type?.kind === "date" ? field.type.max : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          onFocusCell();
          try {
            e.currentTarget.select();
          } catch {
            // Safari throws on select() for some input types; harmless.
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.altKey && isArrowKey(e.key)) {
            e.preventDefault();
            onArrowFromEditor(e.key, e.shiftKey);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            onNavigate(e.shiftKey ? "enter-up" : "enter-down");
            return;
          }
          if (e.key === "Tab") {
            e.preventDefault();
            commit(draft);
            onNavigate(e.shiftKey ? "shift-tab" : "tab");
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setDraft(toEditorValue(rawValue));
            // Re-commit the stored value so a document-scoped field settles back
            // to exactly what the baseline holds.
            if (fieldCommitScope(field) === "document") onCommit(rawValue);
          }
        }}
        className={cn(
          editorClasses,
          alignClasses[align],
          isNumber && numberEditorClasses,
          typeof field.className === "function" ? field.className(row) : field.className,
        )}
      />
      {grip}
    </>
  );
}

export const LineItemsCell = React.memo(LineItemsCellInner) as typeof LineItemsCellInner;
