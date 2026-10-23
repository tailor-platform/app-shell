import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";

export function ListRoot({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="item-list"
      className={cn("astw:flex astw:w-full astw:min-w-0 astw:flex-col astw:gap-1", className)}
      {...props}
    />
  );
}

export function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="item-list-item" className={cn("astw:relative", className)} {...props} />;
}

export const listButtonVariants = cva(
  "astw:flex astw:w-full astw:min-w-0 astw:items-center astw:gap-2 astw:overflow-hidden astw:rounded-md astw:p-2 astw:text-left astw:text-body-md astw:text-foreground astw:outline-hidden astw:ring-ring astw:transition-[width,height,padding] astw:hover:bg-accent astw:hover:text-accent-foreground astw:focus-visible:ring-2 astw:active:bg-accent astw:active:text-accent-foreground astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:aria-disabled:pointer-events-none astw:aria-disabled:opacity-50 astw:data-[active=true]:bg-accent astw:data-[active=true]:font-semibold astw:data-[active=true]:text-accent-foreground astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        outline:
          "astw:bg-background astw:shadow-[0_0_0_1px_var(--border)] astw:hover:shadow-[0_0_0_1px_var(--accent)]",
      },
      size: {
        default: "astw:h-8",
        sm: "astw:h-7 astw:gap-1.5 astw:px-3 astw:has-[>svg]:px-2.5",
        lg: "astw:h-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ListButtonProps = React.ComponentProps<"button"> & {
  render?: React.ReactElement;
  isActive?: boolean;
} & VariantProps<typeof listButtonVariants>;

export function ListButton({
  render,
  isActive = false,
  variant,
  size = "default",
  className,
  ...props
}: ListButtonProps) {
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "item-list-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(listButtonVariants({ variant, size }), className),
      ...props,
    },
  });
}

export function ListSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ListRoot
      data-slot="item-list-sub"
      className={cn(
        "astw:ml-3.5 astw:mr-0 astw:w-auto astw:translate-x-px astw:border-l astw:border-border astw:pl-2.5 astw:pr-0 astw:py-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function ListLabel({
  className,
  render,
  ...props
}: React.ComponentProps<"div"> & { render?: React.ReactElement }) {
  return useRender({
    defaultTagName: "div",
    render,
    props: {
      "data-slot": "item-list-label",
      className: cn(
        "astw:flex astw:h-8 astw:shrink-0 astw:items-center astw:rounded-md astw:px-2 astw:text-label-sm astw:text-muted-foreground",
        className,
      ),
      ...props,
    },
  });
}
