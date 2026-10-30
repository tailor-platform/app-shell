import { Input } from "@/components/input";
import { cn } from "@/lib/utils";
import { isComposing } from "@/lib/is-composing";
import { Text } from "../../text";
import type { SelectOption } from "@/types/collection";
import { Checkbox } from "@/components/checkbox";

// =============================================================================
// BetweenInputGroup — shared UI for "between" filter inputs
// =============================================================================

function BetweenInputGroup({
  labels,
  values,
  onChangeMin,
  onChangeMax,
  onSubmit,
  inputProps,
  error,
}: {
  labels: [string, string];
  values: [string, string];
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  onSubmit: () => void;
  inputProps?: React.ComponentProps<typeof Input>;
  /** Validation message shown below the inputs (e.g. a reversed range). */
  error?: string;
}) {
  const rowBase =
    "astw:flex astw:items-center astw:h-8 astw:rounded-md astw:border astw:shadow-xs astw:has-focus-visible:ring-[3px]";
  const rowOk =
    "astw:border-input astw:has-focus-visible:border-ring astw:has-focus-visible:ring-ring/50";
  const rowError = "astw:border-danger-solid astw:has-focus-visible:ring-danger-solid/30";
  const labelCell =
    "astw:text-secondary-foreground astw:text-body-sm astw:px-2.5 astw:border-r astw:border-input astw:bg-muted astw:rounded-l-md astw:h-full astw:flex astw:items-center astw:justify-center astw:shrink-0 astw:min-w-14";
  const inputCell =
    "astw:h-full astw:text-body-md astw:border-0 astw:shadow-none astw:focus-visible:ring-0";
  return (
    <div className="astw:flex astw:flex-col astw:gap-1.5">
      <div className={cn(rowBase, rowOk)}>
        <span className={labelCell}>{labels[0]}</span>
        <Input
          {...inputProps}
          aria-label={labels[0]}
          value={values[0]}
          onChange={(e) => onChangeMin(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) onSubmit();
          }}
          className={inputCell}
        />
      </div>
      <div className={cn(rowBase, error ? rowError : rowOk)}>
        <span className={labelCell}>{labels[1]}</span>
        <Input
          {...inputProps}
          aria-label={labels[1]}
          aria-invalid={error ? true : undefined}
          value={values[1]}
          onChange={(e) => onChangeMax(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) onSubmit();
          }}
          className={inputCell}
        />
      </div>
      {error && (
        <Text variant="body-sm" className="astw:text-danger-text">
          {error}
        </Text>
      )}
    </div>
  );
}

/**
 * Multi-select option list for enum filters. Rendered identically in the
 * add-filter panel and the chip's value editor so the checkbox style is
 * consistent in both places.
 */
function EnumOptionList({
  options,
  selected,
  onToggle,
}: {
  options: readonly SelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div data-slot="data-table-filter-enum" className="astw:p-1">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "astw:flex astw:cursor-pointer astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-body-md",
            "astw:hover:bg-accent astw:hover:text-accent-foreground",
          )}
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function getTemporalInputProps(type: "datetime" | "date" | "time") {
  switch (type) {
    case "datetime":
      return {
        type: "text" as const,
        placeholder: "2026-04-27T12:34:56Z",
      };
    case "date":
      return {
        type: "date" as const,
      };
    case "time":
      return {
        type: "time" as const,
        step: 60,
      };
  }
}

export { EnumOptionList, BetweenInputGroup, getTemporalInputProps };
