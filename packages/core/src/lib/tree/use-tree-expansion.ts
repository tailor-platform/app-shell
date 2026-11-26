import * as React from "react";

/**
 * @internal
 * Which groups are open, by id. The user's own expansion is controlled
 * (`expandedIds` + `onExpandedChange`) or kept here. On top of it, a filter can
 * open groups (`autoExpand`); the user can still close those, and they reopen
 * when the matches change (`matchKey`).
 */
export type UseTreeExpansionOptions = {
  /** Groups a filter opened. */
  autoExpand?: ReadonlySet<string>;
  /** Names the current set of matches; a new one reopens groups the user closed while filtering. */
  matchKey?: string | null;
  /** Controlled: the ids the user has open. Update it from `onExpandedChange`. */
  expandedIds?: readonly string[];
  /** Initial open ids when uncontrolled. */
  defaultExpandedIds?: readonly string[];
  /** Fires with every open id after the user opens or closes a group. */
  onExpandedChange?: (ids: string[]) => void;
};

export type UseTreeExpansionResult = {
  /** The ids the user has open (not counting groups a filter opened). */
  expandedIds: string[];
  isExpanded(id: string): boolean;
  setExpanded(id: string, next: boolean): void;
  toggleExpand(id: string): void;
};

const NO_IDS: ReadonlySet<string> = new Set();

export function useTreeExpansion(options: UseTreeExpansionOptions = {}): UseTreeExpansionResult {
  const { autoExpand = NO_IDS, matchKey = null, expandedIds, onExpandedChange } = options;
  const controlled = expandedIds !== undefined;

  const [ownExpanded, setOwnExpanded] = React.useState<ReadonlySet<string>>(
    () => new Set(options.defaultExpandedIds),
  );
  const userExpanded = React.useMemo(
    () => (controlled ? new Set(expandedIds) : ownExpanded),
    [controlled, expandedIds, ownExpanded],
  );
  // The latest set, so several changes before a render compose instead of
  // each starting from the same stale value. Controlled, it's only ever what
  // the owner last passed: a change they reject must not linger here.
  const latestRef = React.useRef(userExpanded);
  latestRef.current = userExpanded;
  const onChangeRef = React.useRef(onExpandedChange);
  onChangeRef.current = onExpandedChange;

  // Groups the user closed while a filter had them auto-expanded. Cleared when
  // the matches change, so a new search opens its matches again — but not when
  // an inline filter is merely recreated with the same matches.
  const [searchCollapsed, setSearchCollapsed] = React.useState<ReadonlySet<string>>(NO_IDS);
  React.useEffect(() => {
    setSearchCollapsed((prev) => (prev.size === 0 ? prev : NO_IDS));
  }, [matchKey]);

  const isExpanded = React.useCallback(
    (id: string) => (autoExpand.has(id) && !searchCollapsed.has(id)) || userExpanded.has(id),
    [autoExpand, searchCollapsed, userExpanded],
  );

  /**
   * Opens or closes a group. While filtering, a group the filter opened can
   * still be closed (and reopened) — it keeps showing only the matching items.
   */
  const setExpanded = React.useCallback(
    (id: string, next: boolean) => {
      const prev = latestRef.current;
      if (next !== prev.has(id)) {
        const updated = new Set(prev);
        if (next) updated.add(id);
        else updated.delete(id);
        if (!controlled) {
          latestRef.current = updated;
          setOwnExpanded(updated);
        }
        onChangeRef.current?.([...updated]);
      }
      if (!autoExpand.has(id)) return;
      setSearchCollapsed((collapsed) => {
        if (next !== collapsed.has(id)) return collapsed;
        const updated = new Set(collapsed);
        if (next) updated.delete(id);
        else updated.add(id);
        return updated;
      });
    },
    [autoExpand, controlled],
  );

  const toggleExpand = React.useCallback(
    (id: string) => setExpanded(id, !isExpanded(id)),
    [isExpanded, setExpanded],
  );

  const expandedIdList = React.useMemo(() => [...userExpanded], [userExpanded]);

  return { expandedIds: expandedIdList, isExpanded, setExpanded, toggleExpand };
}
