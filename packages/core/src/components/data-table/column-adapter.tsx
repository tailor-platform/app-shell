import type { ComponentType, ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { BadgeList } from "@/components/badge-list";
import {
  createValueRenderer,
  type ValueRendererOptions,
} from "@/components/internals/table-core/cell-renderers";
import type { ColumnCellType } from "@/components/internals/table-core/column-types";
import {
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "@/components/internals/table-core/input-values";
import type { SelectOption } from "@/types/collection";
import type { Column } from "./types";
import { optionLabel, resolveBadgeOptions } from "./cell-values";
import { TypingEditCell, type TypingEditPolicy } from "./editing/cell/typing";
import { ChoiceEditCell, type ChoiceEditPolicy } from "./editing/cell/choice";
import { DateEditCell } from "./editing/cell/date";
import type { DataTableEditableCellProps } from "./editing/cell/shared";

export type DataTableCellEditor<TRow extends Record<string, unknown>> = {
  readonly icon?: ReactNode;
  readonly canEditValue: (value: unknown) => boolean;
  readonly render: (props: DataTableEditableCellProps<TRow>) => ReactNode;
};

export type DataTableColumnAdapter<TRow extends Record<string, unknown>> = {
  readonly skeletonClassName?: string;
  readonly renderValue: (
    value: unknown,
    row: TRow,
    options?: { linkAsText?: boolean },
  ) => ReactNode;
  readonly editor?: DataTableCellEditor<TRow>;
};

function bindEditor<TRow extends Record<string, unknown>, TOptions extends object>(
  Render: ComponentType<DataTableEditableCellProps<TRow> & TOptions>,
  options: TOptions,
  icon?: ReactNode,
  canEditValue: (value: unknown) => boolean = () => true,
): DataTableCellEditor<TRow> {
  return {
    icon,
    canEditValue,
    render: (props) => (
      <Render
        key={props.col.edit?.error === false ? "unhandled" : "handled"}
        {...props}
        {...options}
        icon={icon}
      />
    ),
  };
}

const textPolicy: TypingEditPolicy = {
  numeric: false,
  toDraft: (value) => toTextValue(value) ?? "",
  parse: toTextValue,
  unchanged: (value, current) => value === toTextValue(current),
};
const numberPolicy: TypingEditPolicy = {
  numeric: true,
  toDraft: (value) => toNumberEditText(toNumberValue(value)),
  parse: (draft) => parseNumberText(normalizeNumberText(draft)),
  unchanged: (value, current) => sameNumber(value as number | null, toNumberValue(current)),
};

function typingEditor<TRow extends Record<string, unknown>>(policy: TypingEditPolicy) {
  return bindEditor<TRow, TypingEditPolicy>(TypingEditCell, policy);
}

function choiceEditor<TRow extends Record<string, unknown>>(
  options: readonly SelectOption[],
  renderOption: ChoiceEditPolicy["renderOption"] = (item) => item.label,
  canEditValue?: (value: unknown) => boolean,
) {
  return bindEditor<TRow, ChoiceEditPolicy>(
    ChoiceEditCell,
    { options, renderOption },
    <ChevronDown />,
    canEditValue,
  );
}

function display<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  timeZone: string | undefined,
  options?: ValueRendererOptions,
): DataTableColumnAdapter<TRow>["renderValue"] {
  return createValueRenderer(col, timeZone ?? "UTC", options);
}

function textColumn<TRow extends Record<string, unknown>>(
  col: Extract<Column<TRow>, { type: "text" | "link" }>,
  timeZone?: string,
): DataTableColumnAdapter<TRow> {
  const render = display(col, timeZone);
  const plain = display(col, timeZone, { linkAsText: true });
  return {
    renderValue: (value, row, options) =>
      (options?.linkAsText ? plain : render)(optionLabel(col.edit?.options, value), row),
    get editor() {
      if (!col.edit) return undefined;
      return col.edit.options
        ? choiceEditor<TRow>(col.edit.options)
        : typingEditor<TRow>(textPolicy);
    },
  };
}

function numericColumn<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  timeZone?: string,
): DataTableColumnAdapter<TRow> {
  return {
    renderValue: display(col, timeZone),
    get editor() {
      return col.edit ? typingEditor<TRow>(numberPolicy) : undefined;
    },
  };
}

type ColumnFactories<TRow extends Record<string, unknown>> = {
  [K in ColumnCellType]: (
    column: Extract<Column<TRow>, { type: K }>,
    timeZone?: string,
  ) => DataTableColumnAdapter<TRow>;
};

/** DataTable alone interprets its display types as editing and label policies. */
function createColumnFactories<TRow extends Record<string, unknown>>() {
  return {
    text: textColumn<TRow>,
    link: textColumn<TRow>,
    number: numericColumn<TRow>,
    money: numericColumn<TRow>,
    date(col, timeZone) {
      return {
        renderValue: display(col, timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
        get editor() {
          return col.edit
            ? bindEditor(
                DateEditCell<TRow>,
                { withTime: col.typeOptions?.dateFormat === "datetime" },
                <CalendarDays />,
              )
            : undefined;
        },
      };
    },
    badge(col, timeZone) {
      const choices = () =>
        col.edit ? resolveBadgeOptions(col.edit.options, col.typeOptions, col.filter) : undefined;
      return {
        skeletonClassName: "astw:h-5.5 astw:rounded-full",
        renderValue: display(col, timeZone, {
          get resolveBadgeLabel() {
            const options = choices();
            return options ? (value: string) => String(optionLabel(options, value)) : undefined;
          },
        }),
        get editor() {
          const options = choices();
          return options?.length
            ? choiceEditor<TRow>(
                options,
                (item) => (
                  <BadgeList
                    value={item.value}
                    options={col.typeOptions}
                    resolveLabel={() => item.label}
                  />
                ),
                (value) => !Array.isArray(value),
              )
            : undefined;
        },
      };
    },
  } satisfies ColumnFactories<TRow>;
}

const columnFactories = createColumnFactories<Record<string, unknown>>() as Record<
  ColumnCellType,
  (
    col: Column<Record<string, unknown>>,
    timeZone?: string,
  ) => DataTableColumnAdapter<Record<string, unknown>>
>;

export function resolveDataTableColumn<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  timeZone?: string,
): DataTableColumnAdapter<TRow> {
  if (col.type === undefined || !Object.hasOwn(columnFactories, col.type))
    return { renderValue: display(col, timeZone) };
  // Public Column already checked the kind-specific configuration; erase only at dispatch.
  return columnFactories[col.type](
    col as Column<Record<string, unknown>>,
    timeZone,
  ) as DataTableColumnAdapter<TRow>;
}
