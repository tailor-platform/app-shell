import { Checkbox } from "@/components/checkbox";
import { cn } from "@/lib/utils";
import { OVERLAY_CLASS_NAME } from "../cell-styles";

export interface BooleanEditorProps {
  value: boolean;
  ariaLabel: string;
  invalid?: boolean;
  describedBy?: string;
  onCommit: (value: boolean) => void;
}

/** A checkbox overlay leaves the parent cell's display in charge of row geometry. */
export function BooleanEditor({
  value,
  ariaLabel,
  invalid,
  describedBy,
  onCommit,
}: BooleanEditorProps) {
  return (
    <div className={cn(OVERLAY_CLASS_NAME, "astw:flex astw:items-center astw:justify-center")}>
      <Checkbox
        checked={value}
        onCheckedChange={(checked) => onCommit(checked)}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
    </div>
  );
}
