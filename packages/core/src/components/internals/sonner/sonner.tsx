import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/theme-context";
import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * Sonner's `<Toaster />`, portaled to `document.body` after mount so it shares
 * a stacking context with the overlays. Why: decisions/floating-ui-stacking.md.
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
