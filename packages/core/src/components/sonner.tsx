import { useColorMode } from "@/contexts/theme-context";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedMode } = useColorMode();

  return (
    <Sonner
      theme={resolvedMode as ToasterProps["theme"]}
      className="astw:toaster astw:group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
