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
} from "@/components/combobox";
import { cn } from "@/lib/utils";

import {
  fieldAllowsFill,
  fieldAllowsPaste,
  fieldCommitScope,
  fieldIsEditableInMode,
} from "./field";
import { useLineItemsGrid } from "./line-items-grid-context";
import type { GridCoord } from "./spreadsheet-logic";
import type {
  LineItemsColumnAlign,
  LineItemsField,
  LineItemsRowData,
  LineItemsSelectOption,
} from "./types";

const alignClass: Record<LineItemsColumnAlign, string> = {
  left: "astw:text-left",
  center: "astw:text-center",
  right: "astw:text-right astw:tabular-nums",
};

function lineItemsSelectOptionToLabel(o: LineItemsSelectOption): string {
  return [o.label, o.description].filter(Boolean).join(" ").trim();
}

function lineItemsSelectOptionToValue(o: LineItemsSelectOption): string {
  return o.value;
}

/* Re-export for callers that still want to test these guards externally. */
export { fieldAllowsFill, fieldAllowsPaste, fieldIsEditableInMode };

/* ======================================================================== */
/* Select (combobox) cell                                                    */
/* ======================================================================== */

function SelectFieldCell<T extends LineItemsRowData>({
  field,
  lineRef,
  row,
  value,
}: {
  field: LineItemsField<T>;
  lineRef: string;
  row: T;
  value: unknown;
}) {
  const ctx = useLineItemsGrid<T>();
  if (!ctx) return null;

  const t = field.type;
  if (!t || t.kind !== "select") return null;

  const strVal = value == null ? "" : String(value);
  const items = React.useMemo((): LineItemsSelectOption[] => {
    const base = [...t.options];
    if (strVal && !base.some((o) => o.value === strVal)) {
      base.push({ value: strVal, label: strVal });
    }
    return base;
  }, [t.options, strVal]);

  const selected = items.find((o) => o.value === strVal) ?? null;

  const onCommit = (next: unknown) => {
    ctx.hookRef.current.updateField(lineRef, field.key as keyof T, next as T[keyof T]);
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    ctx.onCellFocused({ lineRef, columnId: field.key });
    /* Spreadsheet ergonomics: focusing a cell selects all text so the next
       keystroke replaces the value rather than appending to it. */
    e.currentTarget.select();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.altKey &&
      (e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight")
    ) {
      e.preventDefault();
      ctx.navigateArrowFromInput(e.key, e.shiftKey);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (fieldCommitScope(field) === "document") onCommit(strVal);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      ctx.navigateFromEdit("enter-down");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      ctx.navigateFromEdit(e.shiftKey ? "shift-tab" : "tab");
    }
  };

  const className = typeof field.className === "string" ? field.className : field.className?.(row);

  return (
    <div
      className={cn(
        "astw:flex astw:h-full astw:min-h-0 astw:w-full astw:min-w-0 astw:flex-1 astw:flex-col",
        className,
      )}
    >
      <ComboboxRoot<LineItemsSelectOption, false>
        items={items}
        value={selected}
        onValueChange={(next) => {
          onCommit(next?.value ?? "");
        }}
        itemToStringLabel={lineItemsSelectOptionToLabel}
        itemToStringValue={lineItemsSelectOptionToValue}
      >
        <ComboboxInputGroup className="astw:flex-1 astw:min-h-0 astw:items-stretch astw:border-0 astw:bg-transparent astw:shadow-none astw:ring-0 astw:focus-within:ring-0 astw:focus-within:[box-shadow:none]">
          <ComboboxInput
            placeholder={t.placeholder}
            className={cn(
              "astw:h-full astw:min-h-0 astw:w-full astw:min-w-0 astw:flex-1 astw:rounded-none astw:border-0 astw:border-transparent astw:bg-transparent astw:px-2 astw:py-0 astw:text-sm astw:leading-none astw:shadow-none",
              "astw:outline-none astw:focus:outline-none astw:focus-visible:outline-none",
              "astw:ring-0 astw:ring-offset-0 astw:focus:ring-0 astw:focus-visible:ring-0",
              "astw:focus:border-transparent astw:focus-visible:border-transparent",
              "astw:focus:shadow-none astw:focus-visible:shadow-none",
            )}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
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
    </div>
  );
}

/* ======================================================================== */
/* Editable cell                                                             */
/* ======================================================================== */

/**
 * Always-visible input cell. Driven by the field's `type` (number vs text),
 * with full spreadsheet keyboard wiring (Tab / Enter / Esc / Alt+Arrow /
 * Ctrl+Enter) and `onFocus` syncing the active grid coord.
 */
function EditableFieldCell<T extends LineItemsRowData>(p: {
  field: LineItemsField<T>;
  lineRef: string;
  row: T;
  value: unknown;
}) {
  const { field, lineRef, row, value } = p;
  const ctx = useLineItemsGrid<T>();
  if (!ctx) return null;

  const mode = ctx.mode;
  const editable = fieldIsEditableInMode(field, mode);

  const [local, setLocal] = React.useState(() => (value == null ? "" : String(value)));
  React.useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  if (!editable) {
    return (
      <span
        className={cn(
          "astw:flex astw:h-full astw:min-h-0 astw:w-full astw:flex-1 astw:items-center astw:px-2 astw:py-0 astw:leading-none",
          alignClass[field.align ?? "left"],
        )}
      >
        {field.render(row)}
      </span>
    );
  }

  const fieldType = field.type;
  if (fieldType?.kind === "select") {
    return <SelectFieldCell field={field} lineRef={lineRef} row={row} value={value} />;
  }

  const isNumeric = field.type?.kind === "number";

  const parseLocalToCommit = (raw: string): unknown => {
    if (isNumeric) {
      if (raw === "") return null;
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    }
    return raw;
  };

  const onCommit = (next: unknown) => {
    ctx.hookRef.current.updateField(lineRef, field.key as keyof T, next as T[keyof T]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.altKey &&
      (e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight")
    ) {
      e.preventDefault();
      ctx.navigateArrowFromInput(e.key, e.shiftKey);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      const v = value;
      const s = v == null ? "" : String(v);
      setLocal(s);
      if (fieldCommitScope(field) === "document") onCommit(parseLocalToCommit(s));
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      ctx.navigateFromEdit("enter-down");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      ctx.navigateFromEdit(e.shiftKey ? "shift-tab" : "tab");
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    ctx.onCellFocused({ lineRef, columnId: field.key });
    /* Spreadsheet ergonomics: focusing a cell selects all text so the next
       keystroke replaces the value rather than appending to it. Number inputs
       don't support setSelectionRange in Chrome, but `select()` itself works. */
    e.currentTarget.select();
  };

  const className = typeof field.className === "string" ? field.className : field.className?.(row);

  return (
    <input
      type={isNumeric ? "number" : "text"}
      data-slot="line-items-cell-input"
      className={cn(
        "astw:m-0 astw:box-border astw:h-full astw:min-h-0 astw:w-full astw:min-w-0 astw:flex-1 astw:rounded-none astw:border-0 astw:border-transparent astw:bg-transparent astw:px-2 astw:py-0 astw:text-sm astw:text-foreground astw:leading-none astw:shadow-none",
        "astw:outline-none astw:focus:outline-none astw:focus-visible:outline-none",
        "astw:ring-0 astw:ring-offset-0 astw:focus:ring-0 astw:focus-visible:ring-0",
        "astw:focus:border-transparent astw:focus-visible:border-transparent",
        "astw:focus:shadow-none astw:focus-visible:shadow-none",
        "astw:placeholder:text-muted-foreground astw:selection:bg-primary astw:selection:text-primary-foreground",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:[appearance:textfield] astw:[&::-webkit-outer-spin-button]:appearance-none astw:[&::-webkit-outer-spin-button]:m-0 astw:[&::-webkit-inner-spin-button]:appearance-none astw:[&::-webkit-inner-spin-button]:m-0",
        field.align === "right" && "astw:text-right astw:tabular-nums",
        className,
      )}
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        onCommit(parseLocalToCommit(v));
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
}

/* ======================================================================== */
/* Spreadsheet cell shell (overlays + fill grip)                            */
/* ======================================================================== */

/**
 * Wraps each cell with:
 *   - data attributes for grid coord lookup (drag-select / clipboard / fill drag),
 *   - focus / range / fill overlays (all `pointer-events-none`),
 *   - a fill drag handle on the active editable cell.
 *
 * Overlays NEVER block typing; the fill grip is a sibling with its own pointer events.
 */
function SpreadsheetCellShell({
  coord,
  primary,
  selected,
  fillHighlight,
  showFillGrip,
  children,
  onPointerDown,
  onFillGripPointerDown,
}: {
  coord: GridCoord;
  primary: boolean;
  selected: boolean;
  fillHighlight: boolean;
  showFillGrip: boolean;
  children: React.ReactNode;
  onPointerDown: (e: React.PointerEvent) => void;
  onFillGripPointerDown: (e: React.PointerEvent) => void;
}) {
  // Painted via inset box-shadow so the selection ring sits exactly on the cell's
  // visible bounds — no absolute overlay, no rounding/transform mismatch.
  const ringStyle: React.CSSProperties | undefined =
    selected || fillHighlight ? { boxShadow: "inset 0 0 0 2px var(--primary)" } : undefined;
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- grid hit target requires pointer handler
    <div
      data-slot="line-items-grid-cell"
      data-line-ref={coord.lineRef}
      data-column-id={coord.columnId}
      role="gridcell"
      aria-selected={selected}
      className={cn(
        "astw:absolute astw:inset-0 astw:flex astw:min-h-0 astw:min-w-0 astw:items-stretch",
        selected && !primary && "astw:bg-primary/10",
        fillHighlight && "astw:bg-primary/15",
      )}
      style={ringStyle}
      onPointerDown={onPointerDown}
    >
      {children}
      {showFillGrip ? (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- small drag handle requires pointer events
        <span
          data-slot="line-items-fill-grip"
          className="astw:absolute astw:-bottom-[3px] astw:-right-[3px] astw:z-20 astw:h-1.5 astw:w-1.5 astw:cursor-crosshair astw:bg-primary astw:ring-1 astw:ring-background"
          onPointerDown={onFillGripPointerDown}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/* ======================================================================== */
/* Public cell renderer                                                      */
/* ======================================================================== */

export function LineItemsFieldCell<T extends LineItemsRowData>({
  field,
  lineRef,
  row,
}: {
  field: LineItemsField<T>;
  lineRef: string;
  row: T;
}) {
  const ctx = useLineItemsGrid<T>();
  if (!ctx) return null;

  const mode = ctx.mode;
  const value = (row as Record<string, unknown>)[field.key];

  const editable = fieldIsEditableInMode(field, mode);

  const cellBody = editable ? (
    <EditableFieldCell field={field} lineRef={lineRef} row={row} value={value} />
  ) : (
    <span
      className={cn(
        "astw:flex astw:h-full astw:min-h-0 astw:w-full astw:flex-1 astw:items-center astw:px-2 astw:py-0 astw:leading-none",
        alignClass[field.align ?? "left"],
      )}
    >
      {field.render(row)}
    </span>
  );

  const coord: GridCoord = { lineRef, columnId: field.key };
  const primary = ctx.isPrimaryCell(coord);
  const inSel = ctx.isInSelection(coord);
  const fillHighlight = ctx.isInFillPreview(coord);
  const showFill = fieldAllowsFill(field, mode) && primary && ctx.fillPreview === null;

  return (
    <SpreadsheetCellShell
      coord={coord}
      primary={primary}
      selected={inSel}
      fillHighlight={fillHighlight}
      showFillGrip={showFill && editable}
      onPointerDown={(e) => ctx.onCellPointerDown(coord, e)}
      onFillGripPointerDown={(e) => ctx.onFillGripPointerDown(coord, e)}
    >
      {cellBody}
    </SpreadsheetCellShell>
  );
}
