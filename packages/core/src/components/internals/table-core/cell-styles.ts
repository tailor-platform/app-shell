import { cn } from "@/lib/utils";

/** Space reserved by dropdown/date/error icons, including read-only cells. */
export const ICON_SPACE_CLASS_NAME = "astw:pr-5";

// Overlay editors inherit td padding without changing the table's geometry.
export const OVERLAY_CLASS_NAME =
  "astw:absolute astw:inset-0 astw:h-full astw:w-full astw:p-[inherit] astw:rounded-none astw:border-0 astw:shadow-none astw:bg-transparent astw:dark:bg-transparent";

export const CELL_FOCUS_CLASS_NAME = cn(
  "astw:outline-none astw:focus:ring-2 astw:focus:ring-inset astw:focus:ring-primary",
  "astw:focus-visible:ring-2 astw:focus-visible:ring-inset astw:focus-visible:ring-primary",
);

export const CELL_ERROR_CLASS_NAME =
  "astw:ring-[1.5px] astw:ring-inset astw:ring-danger-solid astw:focus:ring-[1.5px] astw:focus:ring-danger-solid astw:focus-visible:ring-[1.5px] astw:focus-visible:ring-danger-solid";

// An image tint preserves pinned/selected/consumer backgrounds underneath it.
export const EDITABLE_CELL_CLASS_NAME = cn(
  "astw:[background-image:linear-gradient(color-mix(in_srgb,var(--foreground)_4%,transparent),color-mix(in_srgb,var(--foreground)_4%,transparent))]",
  "astw:hover:[background-image:linear-gradient(color-mix(in_srgb,var(--foreground)_7%,transparent),color-mix(in_srgb,var(--foreground)_7%,transparent))]",
  "astw:focus-within:[background-image:none]",
);

export const INPUT_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:text-body-md astw:cursor-text",
);

export const ICON_INPUT_CLASS_NAME = "astw:pr-7 astw:[td:last-child>&]:pr-11";

export const CELL_ICON_CLASS_NAME = cn(
  "astw:pointer-events-none astw:absolute astw:inset-y-0 astw:right-2 astw:flex astw:items-center astw:[td:last-child>&]:right-6",
  "astw:text-muted-foreground astw:opacity-0 astw:transition-opacity",
  "astw:group-hover/cell:opacity-30 astw:group-focus-within/cell:opacity-30",
  "astw:[&_svg]:size-3.5",
);

export const POPUP_CLASS_NAME = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:flex astw:flex-col astw:gap-3 astw:rounded-md astw:border astw:border-border astw:p-3 astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:zoom-out-95",
);
