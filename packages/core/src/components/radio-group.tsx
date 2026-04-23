import * as React from "react";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";

import { cn } from "@/lib/utils";

type RadioGroupRootProps<Value = string> = Pick<
  React.ComponentProps<typeof BaseRadioGroup<Value>>,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "disabled"
  | "required"
  | "name"
  | "className"
  | "style"
> & { children: React.ReactNode };

function Root<Value = string>({ className, ...props }: RadioGroupRootProps<Value>) {
  return (
    <BaseRadioGroup
      data-slot="radio-group"
      className={cn("astw:flex astw:flex-col astw:gap-2", className)}
      {...props}
    />
  );
}
Root.displayName = "RadioGroup.Root";

type ItemProps<Value = string> = Pick<
  React.ComponentProps<typeof BaseRadio.Root<Value>>,
  "value" | "disabled" | "required" | "className" | "style"
> & { children?: React.ReactNode };

function Item<Value = string>({ className, children, ...props }: ItemProps<Value>) {
  return (
    <BaseRadio.Root
      data-slot="radio-item"
      className={cn(
        "astw:size-4 astw:shrink-0 astw:rounded-full astw:border astw:border-input astw:bg-background astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:flex astw:items-center astw:justify-center",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-checked:border-primary",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </BaseRadio.Root>
  );
}
Item.displayName = "RadioGroup.Item";

function Indicator({ className, ...props }: React.ComponentProps<typeof BaseRadio.Indicator>) {
  return (
    <BaseRadio.Indicator
      keepMounted
      data-slot="radio-indicator"
      className={cn(
        "astw:block astw:size-2 astw:rounded-full astw:bg-primary astw:opacity-0 astw:transition-opacity astw:data-checked:opacity-100",
        className,
      )}
      {...props}
    />
  );
}
Indicator.displayName = "RadioGroup.Indicator";

export const RadioGroup = {
  Root,
  Item,
  Indicator,
};
