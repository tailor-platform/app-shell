import { useEffect, useRef } from "react";

/**
 * Dev guard: logs each distinct warning once per mounted component.
 *
 * Runs in an effect rather than inline so a component that re-renders often
 * (or twice under StrictMode) doesn't repeat the same line. Deliberately not
 * gated on `process.env.NODE_ENV`: this package has no other reference to
 * `process`, and adding one would break consumers whose bundler does not
 * shim it.
 */
export function useOnceWarnings(warnings: readonly string[]) {
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const warning of warnings) {
      if (seen.current.has(warning)) continue;
      seen.current.add(warning);
      console.warn(warning);
    }
  });
}
