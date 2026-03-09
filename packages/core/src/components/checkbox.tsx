import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function CheckboxGroup({ className, ...props }: React.ComponentProps<typeof BaseCheckboxGroup>) {
  return (
    <BaseCheckboxGroup
      data-slot="checkbox-group"
      className={cn("astw:grid astw:gap-3", className)}
      {...props}
    />
  );
}

function CheckboxIndicator() {
  return (
    <BaseCheckbox.Indicator
      data-slot="checkbox-indicator"
      className="astw:flex astw:items-center astw:justify-center astw:text-current astw:transition-none"
    >
      <CheckIcon className="astw:size-3.5 astw:hidden astw:group-data-indeterminate:hidden astw:group-data-checked:block" />
      <MinusIcon className="astw:size-3.5 astw:hidden astw:group-data-indeterminate:block" />
    </BaseCheckbox.Indicator>
  );
}

function Checkbox({ className, ...props }: React.ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      className={cn(
        "astw:group astw:peer astw:size-4 astw:shrink-0 astw:rounded-lg astw:border astw:border-input astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-checked:bg-primary astw:data-checked:text-primary-foreground astw:data-checked:border-primary",
        "astw:data-indeterminate:bg-primary astw:data-indeterminate:text-primary-foreground astw:data-indeterminate:border-primary",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxIndicator />
    </BaseCheckbox.Root>
  );
}

export { Checkbox, CheckboxGroup };
