import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tracks whether a scroll container is actively scrolling, flipping back to
 * idle a short delay after scrolling stops. Pair with {@link autoHideScrollbarClasses}
 * to show a thin scrollbar only while scrolling (or on hover).
 *
 * @example
 * const { isScrolling, onScroll } = useAutoHideScroll();
 * <div onScroll={onScroll} className={cn("astw:overflow-y-auto astw:-mr-2 astw:pr-2", autoHideScrollbarClasses(isScrolling))}>
 */
export function useAutoHideScroll(delayMs = 600): {
  isScrolling: boolean;
  onScroll: () => void;
} {
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = useCallback(() => {
    setIsScrolling(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      timeoutRef.current = null;
    }, delayMs);
  }, [delayMs]);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  return { isScrolling, onScroll };
}

/**
 * Thin, auto-hiding scrollbar appearance. The bar is 3px, styled with the border
 * token, and only visible while `isScrolling` (or on hover). The caller supplies
 * the overlay offset (e.g. `astw:-mr-2 astw:pr-2`) matching its own container
 * padding so the bar floats over that padding and reserves no width.
 */
export function autoHideScrollbarClasses(isScrolling: boolean): string {
  return cn(
    "astw:[scrollbar-width:thin]",
    "astw:[&::-webkit-scrollbar]:w-[3px] astw:[&::-webkit-scrollbar]:bg-transparent",
    "astw:[&::-webkit-scrollbar-track]:bg-transparent",
    "astw:[&::-webkit-scrollbar-thumb]:rounded-full astw:[&::-webkit-scrollbar-thumb]:bg-border",
    "astw:[&::-webkit-scrollbar-thumb]:transition-opacity astw:[&::-webkit-scrollbar-thumb]:duration-300",
    isScrolling
      ? "astw:[&::-webkit-scrollbar-thumb]:opacity-100"
      : "astw:[&::-webkit-scrollbar-thumb]:opacity-0 astw:hover:[&::-webkit-scrollbar-thumb]:opacity-100",
  );
}
