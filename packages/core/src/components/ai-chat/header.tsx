import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Fixed strip above the transcript: a leading graphic and title on the left,
 * an open action slot on the right, closed by a rule that runs the full width
 * of the surface.
 */
function Header({ title, icon, actions, className }: HeaderProps) {
  return (
    <div
      data-slot="ai-chat-header"
      className={cn(
        "astw:flex astw:h-12 astw:shrink-0 astw:items-center astw:justify-between astw:gap-2 astw:border-b astw:border-border astw:px-3",
        className,
      )}
    >
      <div className="astw:flex astw:min-w-0 astw:items-center astw:gap-1.5 astw:text-sm astw:font-semibold astw:text-foreground">
        {icon === undefined ? (
          <Sparkles className="astw:size-4 astw:shrink-0 astw:text-primary" aria-hidden />
        ) : (
          icon
        )}
        {title == null ? null : <span className="astw:truncate">{title}</span>}
      </div>
      {actions == null ? null : (
        <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-0.5">{actions}</div>
      )}
    </div>
  );
}

export { Header, type HeaderProps };
