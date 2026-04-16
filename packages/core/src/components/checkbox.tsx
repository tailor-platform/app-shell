import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxRootProps = Pick<
  React.ComponentProps<typeof BaseCheckbox.Root>,
  | "checked"
  | "defaultChecked"
  | "onCheckedChange"
  | "disabled"
  | "readOnly"
  | "required"
  | "name"
  | "id"
  | "className"
  | "style"
  | "children"
>;

function Root({ className, ...props }: CheckboxRootProps) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      className={cn(
        "astw:peer astw:size-4 astw:shrink-0 astw:rounded-sm astw:border astw:border-input astw:bg-background astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
Root.displayName = "Checkbox.Root";

function Indicator({ className, ...props }: React.ComponentProps<typeof BaseCheckbox.Indicator>) {
  return (
    <BaseCheckbox.Indicator
      data-slot="checkbox-indicator"
      className={cn("astw:flex astw:items-center astw:justify-center astw:text-current", className)}
      {...props}
    >
      <CheckIcon className="astw:size-3.5" />
    </BaseCheckbox.Indicator>
  );
}
Indicator.displayName = "Checkbox.Indicator";

export const Checkbox = {
  Root,
  Indicator,
};
