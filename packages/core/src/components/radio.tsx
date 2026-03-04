import * as React from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof BaseRadioGroup>) {
  return (
    <BaseRadioGroup
      data-slot="radio-group"
      className={cn("astw:grid astw:gap-3", className)}
      {...props}
    />
  );
}

function RadioIndicator() {
  return (
    <BaseRadio.Indicator
      data-slot="radio-indicator"
      className="astw:relative astw:flex astw:size-full astw:items-center astw:justify-center astw:after:block astw:after:size-2 astw:after:rounded-full astw:after:bg-primary-foreground"
    />
  );
}

function Radio({
  className,
  ...props
}: React.ComponentProps<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root
      data-slot="radio"
      className={cn(
        "astw:group astw:peer astw:size-4 astw:shrink-0 astw:rounded-full astw:border astw:border-input astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-[checked]:bg-primary astw:data-[checked]:border-primary astw:data-[checked]:text-primary-foreground",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioIndicator />
    </BaseRadio.Root>
  );
}

export { Radio, RadioGroup };
