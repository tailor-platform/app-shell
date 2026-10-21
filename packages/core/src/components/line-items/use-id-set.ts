import * as React from "react";

/**
 * A set of line keys that is either controlled (`ids` + `onChange`) or owned
 * here (seeded from `defaultIds`), the way DataTable's `rowSelection` and
 * `rowExpansion` work. `update` derives from the latest value (a ref, so
 * commands issued back-to-back in one tick compose), is a no-op when the
 * updater returns the same set, and reports every change through `onChange`.
 */
export function useIdSet(options: {
  ids: readonly string[] | undefined;
  defaultIds: readonly string[] | undefined;
  onChange: ((ids: string[]) => void) | undefined;
}) {
  const { ids: controlledIds, defaultIds, onChange } = options;
  const [uncontrolled, setUncontrolled] = React.useState<ReadonlySet<string>>(
    () => new Set(defaultIds ?? []),
  );
  const current = React.useMemo<ReadonlySet<string>>(
    () => (controlledIds ? new Set(controlledIds) : uncontrolled),
    [controlledIds, uncontrolled],
  );

  const currentRef = React.useRef(current);
  currentRef.current = current;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const controlledRef = React.useRef(controlledIds !== undefined);
  controlledRef.current = controlledIds !== undefined;

  const update = React.useCallback(
    (updater: (prev: ReadonlySet<string>) => ReadonlySet<string>) => {
      const prev = currentRef.current;
      const next = updater(prev);
      if (next === prev) return;
      currentRef.current = next;
      if (!controlledRef.current) setUncontrolled(next);
      onChangeRef.current?.([...next]);
    },
    [],
  );

  return [current, update] as const;
}
