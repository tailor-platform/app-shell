import * as React from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";
import {
  ListRoot,
  ListItem,
  ListButton,
  ListSub,
  ListLabel,
} from "@/components/internals/item-list-base";
import { cn } from "@/lib/utils";

type ItemProps = React.ComponentProps<"button"> & {
  /** Optional decorative leading icon. */
  icon?: React.ReactNode;
  /** Visual emphasis only; the caller owns route matching and aria-current. */
  isActive?: boolean;
  /** Replaces the inner button, not the containing list item. */
  render?: React.ReactElement;
};

function ItemContent({
  icon,
  children,
  id,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <>
      {icon && (
        <span
          data-slot="item-list-icon"
          aria-hidden="true"
          className="astw:flex astw:size-4 astw:shrink-0 astw:items-center astw:justify-center astw:[&>svg]:size-4"
        >
          {icon}
        </span>
      )}
      <span id={id} data-slot="item-list-label" className="astw:min-w-0 astw:flex-1 astw:truncate">
        {children}
      </span>
    </>
  );
}

/** A compact link or action row. No AppShell, router, or Sidebar provider is required. */
function Item({ icon, children, disabled, render, tabIndex, ...props }: ItemProps) {
  // Capture before handlers supplied through render, which useRender invokes first.
  return (
    <ListItem
      onClickCapture={
        disabled
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
            }
          : undefined
      }
    >
      <ListButton
        {...props}
        render={render}
        disabled={disabled}
        aria-disabled={disabled || props["aria-disabled"]}
        tabIndex={disabled ? -1 : tabIndex}
      >
        <ItemContent icon={icon}>{children}</ItemContent>
      </ListButton>
    </ListItem>
  );
}

type GroupProps = Omit<React.ComponentProps<"li">, "title"> & {
  /** Resolved group label. */
  title: string;
  icon?: React.ReactNode;
  /** Replaces the main heading action; expansion gets a separate button. */
  render?: React.ReactElement;
  isActive?: boolean;
  /** Whether the child list starts expanded. @default true */
  defaultOpen?: boolean;
};

/** An expandable group. A supplied heading link and the expand button remain separate controls. */
function Group({
  title,
  icon,
  render,
  isActive,
  defaultOpen = true,
  children,
  ...props
}: GroupProps) {
  const titleId = React.useId();
  const heading = (
    <ItemContent icon={icon} id={titleId}>
      {title}
    </ItemContent>
  );
  const chevron = (
    <ChevronRight
      aria-hidden="true"
      className="astw:size-4 astw:shrink-0 astw:transition-transform astw:group-data-panel-open/item-list-trigger:rotate-90"
    />
  );

  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      render={<ListItem data-slot="item-list-group" {...props} />}
    >
      {render ? (
        <div className="astw:flex astw:items-center astw:gap-1">
          <ListButton render={render} isActive={isActive}>
            {heading}
          </ListButton>
          <Collapsible.Trigger
            aria-labelledby={titleId}
            className="astw:group/item-list-trigger astw:flex astw:size-8 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-md astw:text-muted-foreground astw:outline-hidden astw:ring-ring astw:hover:bg-accent astw:hover:text-accent-foreground astw:focus-visible:ring-2"
          >
            {chevron}
          </Collapsible.Trigger>
        </div>
      ) : (
        <Collapsible.Trigger
          render={<ListButton isActive={isActive} className="astw:group/item-list-trigger" />}
        >
          {heading}
          {chevron}
        </Collapsible.Trigger>
      )}
      <Collapsible.Panel>
        <ListSub aria-labelledby={titleId}>{children}</ListSub>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

type SectionProps = Omit<React.ComponentProps<"li">, "title"> & { title: string };

/** A static heading and a flat list, without group indentation or an expand control. */
function Section({ title, children, className, ...props }: SectionProps) {
  const titleId = React.useId();
  return (
    <ListItem
      data-slot="item-list-section"
      className={cn("astw:flex astw:min-w-0 astw:flex-col astw:gap-1", className)}
      {...props}
    >
      <ListLabel id={titleId} data-slot="item-list-section-title">
        {title}
      </ListLabel>
      <ListRoot aria-labelledby={titleId}>{children}</ListRoot>
    </ListItem>
  );
}

/** A decorative divider that remains a valid child of a list. */
function Separator({ className, ...props }: Omit<React.ComponentProps<"li">, "children">) {
  return (
    <li
      data-slot="item-list-separator"
      aria-hidden="true"
      className={cn(
        "astw:mx-2 astw:mt-1 astw:mb-2 astw:h-px astw:shrink-0 astw:bg-border",
        className,
      )}
      {...props}
    />
  );
}

/** Compact icon-and-label lists with links, actions, groups, sections, and separators. */
export const ItemList = { Root: ListRoot, Item, Group, Section, Separator };
