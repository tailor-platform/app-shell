import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Text } from "../text";
import { mergeRefs } from "../toolbar/toolbar";

// Only the props relevant to the Dialog abstraction are picked from BaseDialog.Root.
// Base UI-internal props (e.g. dismissible, animated) are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
type DialogRootProps = Pick<
  React.ComponentProps<typeof BaseDialog.Root>,
  "open" | "defaultOpen" | "onOpenChange" | "modal"
> & {
  children: React.ReactNode;
};

/**
 * The root component that manages dialog open/close state.
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Are you sure?</Dialog.Title>
 *       <Dialog.Description>This action cannot be undone.</Dialog.Description>
 *     </Dialog.Header>
 *     <Dialog.Footer>
 *       <Button variant="outline">Cancel</Button>
 *       <Button>Confirm</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
function Root({ ...props }: DialogRootProps) {
  return <BaseDialog.Root data-slot="dialog" {...props} />;
}
Root.displayName = "Dialog.Root";

/** The element that opens the dialog when clicked. */
function Trigger({ ...props }: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}
Trigger.displayName = "Dialog.Trigger";

/** @internal Renders dialog content into a React portal. */
function Portal({ ...props }: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal data-slot="dialog-portal" {...props} />;
}
Portal.displayName = "Dialog.Portal";

/** A button that closes the dialog. */
function Close({ ...props }: React.ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="dialog-close" {...props} />;
}
Close.displayName = "Dialog.Close";

/** @internal The backdrop overlay that appears behind the dialog. */
function Overlay({ className, ...props }: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fill-mode-forwards astw:fixed astw:inset-0 astw:z-(--z-portal) astw:bg-backdrop",
        className,
      )}
      {...props}
    />
  );
}
Overlay.displayName = "Dialog.Overlay";

type Size = "sm" | "md" | "lg" | "xl";

// Same steps as `Sheet.Content`'s `size`, so a form keeps its width when it
// moves between a dialog and a sheet. Each size keeps the base 1rem margin on
// both sides (`min(…, 100% - 2rem)`): `lg` and `xl` are wider than the `sm`
// breakpoint, so a plain `max-w-[45rem]` would touch the screen edges
// between 640px and the size.
const sizeClasses: Record<Size, string> = {
  sm: "astw:sm:max-w-[min(24rem,calc(100%-2rem))]",
  md: "astw:sm:max-w-[min(32rem,calc(100%-2rem))]",
  lg: "astw:sm:max-w-[min(45rem,calc(100%-2rem))]",
  xl: "astw:sm:max-w-[min(60rem,calc(100%-2rem))]",
};

type DialogContentProps = React.ComponentProps<typeof BaseDialog.Popup> & {
  /** Controls the max-width of the dialog panel (`sm` 24rem | `md` 32rem | `lg` 45rem | `xl` 60rem), always leaving a 1rem margin on each side. @default "md" */
  size?: Size;
};

const TABBABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]';

/** The first element in `root` that the Tab key would reach, in DOM order. */
function firstTabbable(root: HTMLElement): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR));
  return (
    candidates.find(
      (el) =>
        el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0,
    ) ?? null
  );
}

/**
 * The main dialog panel that contains the dialog content. Automatically includes a close button and overlay.
 *
 * The panel never grows past the viewport height. Wrap long content (e.g. a
 * form) in `Dialog.Body` so it scrolls while the header and footer stay put;
 * without a `Body`, the whole panel scrolls.
 */
function Content({
  className,
  children,
  ref,
  initialFocus,
  size = "md",
  ...props
}: DialogContentProps) {
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Base UI focuses the first tabbable element on open (the popup itself on
  // touch). In a dialog that scrolls, that element is often a footer button,
  // and focusing it scrolls the dialog to the bottom before the user sees the
  // title. So when the content overflows and the first control is below the
  // fold, focus the popup instead: it opens at the top, and Tab still reaches
  // the control. A control that is already in view (an input at the top of a
  // long form) keeps focus. Base UI calls this after the popup is in the DOM,
  // so it can be measured here.
  const defaultInitialFocus: DialogContentProps["initialFocus"] = (openType) => {
    const popup = popupRef.current;
    if (!popup) return true;
    if (openType === "touch") return popup;
    if (popup.scrollHeight <= popup.clientHeight) return true;
    const first = firstTabbable(popup);
    if (!first) return popup;
    const box = popup.getBoundingClientRect();
    const rect = first.getBoundingClientRect();
    return rect.top >= box.top && rect.bottom <= box.bottom ? first : popup;
  };

  return (
    <Portal data-slot="dialog-portal">
      <Overlay />
      <BaseDialog.Popup
        data-slot="dialog-content"
        ref={mergeRefs(popupRef, ref)}
        initialFocus={initialFocus ?? defaultInitialFocus}
        // max-h + overflow-y-auto: content taller than the viewport scrolls
        // inside the dialog instead of running off both edges, where the page
        // behind it cannot scroll. 2rem matches the horizontal margin, and dvh
        // follows the mobile browser bar as it shows and hides.
        //
        // In a flex column, children would shrink to fit the max height, and
        // a child that is itself a scroll container (a table wrapper, any
        // `overflow-*` block) would get its own scrollbar inside the dialog's.
        // So only `Dialog.Body` shrinks; everything else keeps its height and
        // the dialog scrolls instead.
        className={cn(
          "astw:bg-card astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:fill-mode-forwards astw:fixed astw:top-[50%] astw:left-[50%] astw:z-(--z-portal) astw:flex astw:flex-col astw:w-full astw:max-w-[calc(100%-2rem)] astw:max-h-[calc(100dvh-2rem)] astw:overflow-y-auto astw:translate-x-[-50%] astw:translate-y-[-50%] astw:gap-4 astw:rounded-lg astw:border astw:border-border astw:p-6 astw:shadow-lg astw:duration-200",
          "astw:[&>*:not([data-slot=dialog-body])]:shrink-0",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
        <BaseDialog.Close className="astw:ring-offset-card astw:focus:ring-ring astw:data-open:bg-accent astw:data-open:text-muted-foreground astw:absolute astw:top-4 astw:right-4 astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="astw:sr-only">Close</span>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </Portal>
  );
}
Content.displayName = "Dialog.Content";

/** A layout wrapper for the dialog title and description. */
function Header({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "astw:flex astw:flex-col astw:gap-2 astw:text-center astw:sm:text-left",
        className,
      )}
      {...props}
    />
  );
}
Header.displayName = "Dialog.Header";

/**
 * The scrollable middle of the dialog, between `Dialog.Header` and
 * `Dialog.Footer`. Long content scrolls here instead of pushing the footer
 * off-screen. It is the only child of `Dialog.Content` that shrinks.
 */
function Body({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      // Negative margin + matching padding keeps focus rings from being
      // clipped by the scroll container.
      className={cn(
        "astw:-mx-6 astw:min-h-0 astw:flex-1 astw:overflow-y-auto astw:px-6 astw:py-1",
        className,
      )}
      {...props}
    />
  );
}
Body.displayName = "Dialog.Body";

/** A layout wrapper for dialog action buttons, typically placed at the bottom. */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Buttons keep their own width, right-aligned at every size — never stretched full width.
        "astw:flex astw:flex-wrap astw:items-center astw:justify-end astw:gap-2",
        className,
      )}
      {...props}
    />
  );
}
Footer.displayName = "Dialog.Footer";

/** The title of the dialog, announced by screen readers. */
function Title({ className, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <Text
      variant="heading-md"
      className={cn("astw:leading-none", className)}
      render={<BaseDialog.Title data-slot="dialog-title" {...props} />}
    />
  );
}
Title.displayName = "Dialog.Title";

/** A description that provides additional context for the dialog. */
function Description({ className, ...props }: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <Text
      variant="body-md"
      className={cn("astw:text-muted-foreground", className)}
      render={<BaseDialog.Description data-slot="dialog-description" {...props} />}
    />
  );
}
Description.displayName = "Dialog.Description";

export const Dialog = {
  Root,
  Body,
  Close,
  Content,
  Description,
  Footer,
  Header,
  Title,
  Trigger,
};
