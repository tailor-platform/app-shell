import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function SelectRoot({
  ...props
}: React.ComponentProps<typeof BaseSelect.Root>) {
  return <BaseSelect.Root data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      className={cn(
        "astw:border-input astw:bg-background astw:text-foreground astw:flex astw:h-9 astw:w-full astw:items-center astw:justify-between astw:gap-2 astw:rounded-md astw:border astw:px-3 astw:py-2 astw:text-sm astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:placeholder:text-muted-foreground",
        "astw:[&_svg]:pointer-events-none astw:[&_svg:not([class*='size-'])]:size-4 astw:[&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon>
        <ChevronDownIcon className="astw:size-4 astw:opacity-50" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof BaseSelect.Value>) {
  return <BaseSelect.Value data-slot="select-value" {...props} />;
}

function SelectContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.Popup>) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner>
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-50 astw:w-[var(--anchor-width)] astw:min-w-32 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
            className,
          )}
          {...props}
        />
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:pr-8 astw:pl-2 astw:text-sm astw:outline-hidden astw:select-none",
        "astw:focus:bg-accent astw:focus:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        "astw:[&_svg]:pointer-events-none astw:[&_svg:not([class*='size-'])]:size-4 astw:[&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="astw:absolute astw:right-2 astw:flex astw:size-3.5 astw:items-center astw:justify-center">
        <BaseSelect.ItemIndicator>
          <CheckIcon className="astw:size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof BaseSelect.Group>) {
  return <BaseSelect.Group data-slot="select-group" {...props} />;
}

function SelectGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.GroupLabel>) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={cn(
        "astw:text-muted-foreground astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("astw:bg-muted astw:-mx-1 astw:my-1 astw:h-px", className)}
      {...props}
    />
  );
}

const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Item: SelectItem,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
  Separator: SelectSeparator,
};

export { Select };
