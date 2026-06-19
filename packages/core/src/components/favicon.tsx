import { useEffect } from "react";
import { DEFAULT_FAVICON_HREF } from "@/lib/default-favicon";

type FaviconProps = {
  /**
   * Favicon href to apply. Any value accepted by `<link rel="icon">` works:
   * a public-path URL (e.g. `/favicon.ico`) or a data URI. When omitted, the
   * bundled Tailor default ({@link DEFAULT_FAVICON_HREF}) is used.
   */
  href?: string;
};

/**
 * Keeps the document favicon in sync with the `favicon` prop passed to
 * `<AppShell>`, falling back to the bundled Tailor mark when none is given.
 *
 * Updates the existing `<link rel="icon">` from `index.html` in place (or
 * creates one if absent), so consumers don't need to declare a favicon link
 * themselves. Rendered once by `<AppShell>`.
 *
 * @internal
 */
export const Favicon = ({ href }: FaviconProps) => {
  const resolved = href ?? DEFAULT_FAVICON_HREF;

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = resolved;
  }, [resolved]);

  return null;
};
