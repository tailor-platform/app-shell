import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/tooltip";

/**
 * A text label that truncates with an ellipsis and reveals a tooltip with the
 * full text **only when it's actually clipped**. Used by the DataTable field and
 * column pickers, where names can exceed the list's max width.
 *
 * The wrapper (Tooltip.Root + Trigger) is always rendered so the measured span
 * keeps a stable identity; only the tooltip content is gated on truncation.
 */
export function TruncatedLabel({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <Tooltip.Provider delay={2000}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <span ref={ref} className={cn("astw:block astw:truncate", className)}>
              {text}
            </span>
          }
        />
        {truncated && <Tooltip.Content>{text}</Tooltip.Content>}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
