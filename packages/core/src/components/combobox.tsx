import * as React from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function ComboboxRoot<Value, Multiple extends boolean | undefined = false>({
  ...props
}: React.ComponentProps<typeof BaseCombobox.Root<Value, Multiple>>) {
  return <BaseCombobox.Root data-slot="combobox" {...props} />;
}

function ComboboxInput({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Input>) {
  return (
    <BaseCombobox.Input
      data-slot="combobox-input"
      className={cn(
        "astw:border-input astw:bg-background astw:text-foreground astw:placeholder:text-muted-foreground astw:flex astw:h-9 astw:w-full astw:rounded-md astw:border astw:px-3 astw:py-1 astw:text-sm astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Trigger>) {
  return (
    <BaseCombobox.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-0 astw:flex astw:items-center astw:px-2 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? (
        <BaseCombobox.Icon>
          <ChevronDownIcon className="astw:size-4" />
        </BaseCombobox.Icon>
      )}
    </BaseCombobox.Trigger>
  );
}

function ComboboxContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Popup>) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner>
        <BaseCombobox.Popup
          data-slot="combobox-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-50 astw:min-w-32 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
            className,
          )}
          {...props}
        />
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

function ComboboxList({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.List>) {
  return (
    <BaseCombobox.List
      data-slot="combobox-list"
      className={cn("astw:max-h-60 astw:overflow-y-auto astw:p-1", className)}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Item>) {
  return (
    <BaseCombobox.Item
      data-slot="combobox-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:pr-8 astw:pl-2 astw:text-sm astw:outline-hidden astw:select-none",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="astw:absolute astw:right-2 astw:flex astw:size-3.5 astw:items-center astw:justify-center">
        <BaseCombobox.ItemIndicator>
          <CheckIcon className="astw:size-4" />
        </BaseCombobox.ItemIndicator>
      </span>
      {children}
    </BaseCombobox.Item>
  );
}

function ComboboxEmpty({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Empty>) {
  return (
    <BaseCombobox.Empty
      data-slot="combobox-empty"
      className={cn(
        "astw:py-6 astw:text-center astw:text-sm astw:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxGroup({
  ...props
}: React.ComponentProps<typeof BaseCombobox.Group>) {
  return <BaseCombobox.Group data-slot="combobox-group" {...props} />;
}

function ComboboxGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.GroupLabel>) {
  return (
    <BaseCombobox.GroupLabel
      data-slot="combobox-group-label"
      className={cn(
        "astw:text-muted-foreground astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxClear({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Clear>) {
  return (
    <BaseCombobox.Clear
      data-slot="combobox-clear"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-6 astw:flex astw:items-center astw:px-1 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="astw:size-3.5" />}
    </BaseCombobox.Clear>
  );
}

const Combobox = {
  Root: ComboboxRoot,
  Input: ComboboxInput,
  Trigger: ComboboxTrigger,
  Content: ComboboxContent,
  List: ComboboxList,
  Item: ComboboxItem,
  Empty: ComboboxEmpty,
  Group: ComboboxGroup,
  GroupLabel: ComboboxGroupLabel,
  Clear: ComboboxClear,
};

export { Combobox };
