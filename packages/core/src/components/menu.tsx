import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

// Only the props relevant to the Menu abstraction are picked from BaseMenu.Root.
// Base UI-internal props are intentionally excluded so that
// upstream changes don't leak as breaking changes to consumers.
type MenuRootProps = Pick<
  React.ComponentProps<typeof BaseMenu.Root>,
  "open" | "defaultOpen" | "onOpenChange" | "modal" | "disabled"
> & {
  children: React.ReactNode;
};

/**
 * The root component that manages menu open/close state.
 *
 * @example
 * ```tsx
 * <Menu.Root>
 *   <Menu.Trigger>Open menu</Menu.Trigger>
 *   <Menu.Content>
 *     <Menu.Item>Edit</Menu.Item>
 *     <Menu.Item>Duplicate</Menu.Item>
 *     <Menu.Separator />
 *     <Menu.Item>Delete</Menu.Item>
 *   </Menu.Content>
 * </Menu.Root>
 * ```
 */
function Root({ children, ...props }: MenuRootProps) {
  return (
    <BaseMenu.Root data-slot="menu" {...props}>
      {children}
    </BaseMenu.Root>
  );
}
Root.displayName = "Menu.Root";

/** The element that opens the menu when clicked. */
function Trigger({ ...props }: React.ComponentProps<typeof BaseMenu.Trigger>) {
  return <BaseMenu.Trigger data-slot="menu-trigger" {...props} />;
}
Trigger.displayName = "Menu.Trigger";

/** The menu popup that displays menu items. */
function Content({
  className,
  sideOffset = 4,
  side = "bottom",
  align = "start",
  children,
  ...restProps
}: React.ComponentProps<typeof BaseMenu.Popup> & {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset} side={side} align={align}>
        <BaseMenu.Popup
          data-slot="menu-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:z-50 astw:min-w-[8rem] astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:p-1 astw:shadow-md",
            "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            "astw:data-[side=bottom]:slide-in-from-top-2 astw:data-[side=left]:slide-in-from-right-2 astw:data-[side=right]:slide-in-from-left-2 astw:data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...restProps}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}
Content.displayName = "Menu.Content";

/** An individual interactive item in the menu. */
function Item({ className, ...props }: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      data-slot="menu-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-sm astw:outline-hidden",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        "astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}
Item.displayName = "Menu.Item";

/** A link item in the menu that can be used to navigate to a different page. */
function LinkItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.LinkItem>) {
  return (
    <BaseMenu.LinkItem
      data-slot="menu-link-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-sm astw:outline-hidden astw:no-underline",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}
LinkItem.displayName = "Menu.LinkItem";

/** A menu item that toggles a setting on or off. */
function CheckboxItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.CheckboxItem>) {
  return (
    <BaseMenu.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:pr-2 astw:pl-8 astw:text-sm astw:outline-hidden",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
CheckboxItem.displayName = "Menu.CheckboxItem";

/** Indicates whether the checkbox item is ticked. */
function CheckboxItemIndicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.CheckboxItemIndicator>) {
  return (
    <BaseMenu.CheckboxItemIndicator
      data-slot="menu-checkbox-item-indicator"
      className={cn(
        "astw:absolute astw:left-2 astw:inline-flex astw:items-center astw:justify-center",
        className,
      )}
      {...props}
    />
  );
}
CheckboxItemIndicator.displayName = "Menu.CheckboxItemIndicator";

/** A menu item that works like a radio button in a given group. */
function RadioItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.RadioItem>) {
  return (
    <BaseMenu.RadioItem
      data-slot="menu-radio-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:pr-2 astw:pl-8 astw:text-sm astw:outline-hidden",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
RadioItem.displayName = "Menu.RadioItem";

/** Indicates whether the radio item is selected. */
function RadioItemIndicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.RadioItemIndicator>) {
  return (
    <BaseMenu.RadioItemIndicator
      data-slot="menu-radio-item-indicator"
      className={cn(
        "astw:absolute astw:left-2 astw:inline-flex astw:items-center astw:justify-center",
        className,
      )}
      {...props}
    />
  );
}
RadioItemIndicator.displayName = "Menu.RadioItemIndicator";

/** Groups related radio items. */
function RadioGroup({ ...props }: React.ComponentProps<typeof BaseMenu.RadioGroup>) {
  return <BaseMenu.RadioGroup data-slot="menu-radio-group" {...props} />;
}
RadioGroup.displayName = "Menu.RadioGroup";

/** Groups related menu items with the corresponding label. */
function Group({ ...props }: React.ComponentProps<typeof BaseMenu.Group>) {
  return <BaseMenu.Group data-slot="menu-group" {...props} />;
}
Group.displayName = "Menu.Group";

/** An accessible label that is automatically associated with its parent group. */
function GroupLabel({ className, ...props }: React.ComponentProps<typeof BaseMenu.GroupLabel>) {
  return (
    <BaseMenu.GroupLabel
      data-slot="menu-group-label"
      className={cn(
        "astw:px-2 astw:py-1.5 astw:text-xs astw:font-semibold astw:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
GroupLabel.displayName = "Menu.GroupLabel";

/** A visual separator between menu items. */
function MenuSeparator({ className, ...props }: React.ComponentProps<typeof BaseMenu.Separator>) {
  return (
    <BaseMenu.Separator
      data-slot="menu-separator"
      className={cn("astw:bg-border astw:-mx-1 astw:my-1 astw:h-px", className)}
      {...props}
    />
  );
}
MenuSeparator.displayName = "Menu.Separator";

// Only the props relevant to the SubmenuRoot abstraction are picked.
type SubmenuRootProps = Pick<
  React.ComponentProps<typeof BaseMenu.SubmenuRoot>,
  "open" | "defaultOpen" | "onOpenChange" | "disabled"
> & {
  children: React.ReactNode;
};

/** Groups all parts of a submenu. */
function SubmenuRoot({ children, ...props }: SubmenuRootProps) {
  return (
    <BaseMenu.SubmenuRoot data-slot="menu-submenu" {...props}>
      {children}
    </BaseMenu.SubmenuRoot>
  );
}
SubmenuRoot.displayName = "Menu.SubmenuRoot";

/** A menu item that opens a submenu. */
function SubmenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.SubmenuTrigger>) {
  return (
    <BaseMenu.SubmenuTrigger
      data-slot="menu-submenu-trigger"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-sm astw:outline-hidden",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        "astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}
SubmenuTrigger.displayName = "Menu.SubmenuTrigger";

export const Menu = {
  Root,
  Trigger,
  Content,
  Item,
  LinkItem,
  CheckboxItem,
  CheckboxItemIndicator,
  RadioItem,
  RadioItemIndicator,
  RadioGroup,
  Group,
  GroupLabel,
  Separator: MenuSeparator,
  SubmenuRoot,
  SubmenuTrigger,
};
