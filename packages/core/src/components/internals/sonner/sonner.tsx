import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/theme-context";
import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * Sonner's `<Toaster />`, rendered through a portal to `document.body`.
 *
 * The Toaster mounts inside the content column (next to the route outlet), whose
 * scroll container creates a stacking context (`mask-image` for the scroll fade).
 * Dialogs, sheets and popups all portal to the end of `body`, so a toast that
 * stays in the column can never paint above them, whatever its z-index
 * (tailor-inc/platform-planning#2040). Portaling the Toaster to `body` puts it in
 * the same stacking context as the overlays; `--z-toast` then lifts it above the
 * portal band (tailor-inc/platform-planning#2349).
 *
 * The portal is created after mount so the component renders nothing on the server.
 */
const Toaster = ({ style, ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
  }, []);

  if (!container) return null;

  return createPortal(
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="astw:toaster astw:group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Sonner's own stylesheet sets `z-index: 999999999` on `[data-sonner-toaster]`
          // from an unlayered `<style>` it injects at runtime, so a prefixed utility in
          // `@layer utilities` cannot override it. An inline style can, without `!important`,
          // and matches how the Portal components set their z-index.
          zIndex: "var(--z-toast)",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />,
    container,
  );
};

export { Toaster };
