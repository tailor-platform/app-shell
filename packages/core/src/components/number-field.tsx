import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function NumberFieldRoot({
  className,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Root>) {
  return (
    <BaseNumberField.Root
      data-slot="number-field"
      className={cn("astw:flex astw:flex-col astw:gap-1", className)}
      {...props}
    />
  );
}

function NumberFieldInput({
  className,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Input>) {
  return (
    <BaseNumberField.Input
      data-slot="number-field-input"
      className={cn(
        "astw:border-input astw:bg-background astw:text-foreground astw:placeholder:text-muted-foreground astw:flex astw:h-9 astw:w-full astw:rounded-md astw:border astw:px-3 astw:py-1 astw:text-sm astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function NumberFieldGroup({
  className,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Group>) {
  return (
    <BaseNumberField.Group
      data-slot="number-field-group"
      className={cn("astw:relative astw:flex astw:items-center", className)}
      {...props}
    />
  );
}

function NumberFieldIncrement({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Increment>) {
  return (
    <BaseNumberField.Increment
      data-slot="number-field-increment"
      className={cn(
        "astw:absolute astw:right-0 astw:top-0 astw:flex astw:h-1/2 astw:w-6 astw:items-center astw:justify-center astw:border-l astw:border-b astw:border-input astw:text-muted-foreground astw:outline-none astw:transition-colors",
        "astw:hover:text-foreground",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronUpIcon className="astw:size-3" />}
    </BaseNumberField.Increment>
  );
}

function NumberFieldDecrement({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Decrement>) {
  return (
    <BaseNumberField.Decrement
      data-slot="number-field-decrement"
      className={cn(
        "astw:absolute astw:right-0 astw:bottom-0 astw:flex astw:h-1/2 astw:w-6 astw:items-center astw:justify-center astw:border-l astw:border-input astw:text-muted-foreground astw:outline-none astw:transition-colors",
        "astw:hover:text-foreground",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronDownIcon className="astw:size-3" />}
    </BaseNumberField.Decrement>
  );
}

const NumberField = {
  Root: NumberFieldRoot,
  Input: NumberFieldInput,
  Group: NumberFieldGroup,
  Increment: NumberFieldIncrement,
  Decrement: NumberFieldDecrement,
};

export { NumberField };
