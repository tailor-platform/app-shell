import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Typography role names from `theme.bridge.css` (`text-heading-lg`, ...).
 * tailwind-merge treats an unknown `text-*` value as a text color, so without
 * this list `cn("text-label-md", "text-muted-foreground")` keeps only the color.
 * `src/lib/utils.test.ts` checks that this list matches the roles in `default.css`.
 */
const TYPOGRAPHY_ROLES = [
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-md",
  "body-sm",
  "label-md",
  "label-sm",
  "code-sm",
  "body-md-relaxed",
  "body-sm-relaxed",
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: TYPOGRAPHY_ROLES }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
