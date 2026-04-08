import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * An action entry displayed in the CommandPalette.
 *
 * Actions registered via `useRegisterCommandPaletteActions` (or implicitly
 * through `ActionPanel`) appear in the "Actions" section of the palette and
 * are searchable by `label`.
 */
export type CommandPaletteAction = {
  /** Unique key for React reconciliation */
  key: string;
  /** Visible label shown in the palette (also used for search matching) */
  label: string;
  /** Optional icon rendered next to the label */
  icon?: ReactNode;
  /**
   * Group name used to categorise the action (e.g. the ActionPanel title).
   * When using `useRegisterCommandPaletteActions`, the hook fills this from
   * its `group` parameter if not already set.
   */
  group?: string;
  /** Callback invoked when the action is selected */
  onSelect: () => void | Promise<void>;
};

/**
 * A single search result returned by a `CommandPaletteSearchSource`.
 *
 * Selecting a result navigates to `path`.
 */
export type CommandPaletteSearchResult = {
  /** Unique key for React reconciliation */
  key: string;
  /** Visible label shown in the palette (e.g. "Order #ORD-1234") */
  label: string;
  /** Optional secondary text (e.g. "山田太郎 - 2024/01/15") */
  description?: string;
  /** Optional icon for this specific result */
  icon?: ReactNode;
  /** Resolved navigation path (e.g. "/orders/abc-123") */
  path: string;
};

/**
 * An async search source that can be plugged into the CommandPalette.
 *
 * Each source is activated by typing its `prefix` followed by `:` in the
 * search input (e.g. `PO:` for Purchase Orders). The prefix match is
 * case-sensitive.
 */
export type CommandPaletteSearchSource = {
  /** Mode-switching prefix (e.g. "PO"). Case-sensitive, alphanumeric only. */
  prefix: string;
  /** Heading shown above search results (e.g. "Purchase Orders") */
  title: string;
  /** Optional icon shown next to each result that lacks its own icon */
  icon?: ReactNode;
  /** Async search function. Receives the query after the prefix and an AbortSignal. */
  search: (
    query: string,
    options: { signal: AbortSignal },
  ) => Promise<CommandPaletteSearchResult[]>;
};

type DispatchContextValue = {
  register: (sourceId: string, actions: CommandPaletteAction[]) => () => void;
};

type StateContextValue = {
  actions: CommandPaletteAction[];
  searchSources: CommandPaletteSearchSource[];
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteDispatchContext = createContext<DispatchContextValue | null>(null);
const CommandPaletteStateContext = createContext<StateContextValue | null>(null);

/**
 * Provider that manages contextual actions and open state for the CommandPalette.
 *
 * Placed inside `AppShell`; consumers register/unregister actions via
 * `useRegisterCommandPaletteActions`, and the `CommandPalette` component
 * reads them via `useCommandPaletteActions`.
 *
 * @internal — mounted automatically by AppShell; not intended for direct use.
 */
export function CommandPaletteProvider({
  children,
  searchSources = [],
}: {
  children: ReactNode;
  searchSources?: CommandPaletteSearchSource[];
}) {
  const registryRef = useRef(new Map<string, CommandPaletteAction[]>());
  const [actions, setActions] = useState<CommandPaletteAction[]>([]);
  const [open, setOpen] = useState(false);

  const updateActions = useCallback(() => {
    setActions(Array.from(registryRef.current.values()).flat());
  }, []);

  const register = useCallback(
    (sourceId: string, newActions: CommandPaletteAction[]) => {
      registryRef.current.set(sourceId, newActions);
      updateActions();
      return () => {
        registryRef.current.delete(sourceId);
        updateActions();
      };
    },
    [updateActions],
  );

  // Global keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const dispatchValue = useMemo(() => ({ register }), [register]);
  const stateValue = useMemo(
    () => ({ actions, searchSources, open, setOpen }),
    [actions, searchSources, open],
  );

  return (
    <CommandPaletteDispatchContext.Provider value={dispatchValue}>
      <CommandPaletteStateContext.Provider value={stateValue}>
        {children}
      </CommandPaletteStateContext.Provider>
    </CommandPaletteDispatchContext.Provider>
  );
}

/**
 * Returns a `register` function to add contextual actions to the CommandPalette.
 *
 * @internal — used by `useRegisterCommandPaletteActions` and `ActionPanel`.
 * Prefer `useRegisterCommandPaletteActions` for public usage.
 */
export function useCommandPaletteDispatch(): DispatchContextValue {
  const ctx = useContext(CommandPaletteDispatchContext);
  if (!ctx) {
    throw new Error("useCommandPaletteDispatch must be used within CommandPaletteProvider");
  }
  return ctx;
}

/**
 * Declaratively register contextual actions to the CommandPalette.
 *
 * Actions are registered while the calling component is mounted and
 * automatically unregistered on unmount. Re-registering with new actions
 * replaces the previous set.
 *
 * Note: `icon` changes alone do not trigger re-registration. If you need
 * dynamic icons, also change the action's `key` or `label`.
 *
 * @example
 * ```tsx
 * import { useRegisterCommandPaletteActions } from "@tailor-platform/app-shell";
 *
 * function MyComponent() {
 *   useRegisterCommandPaletteActions("My Page", [
 *     { key: "refresh", label: "Refresh data", onSelect: () => refetch() },
 *   ]);
 * }
 * ```
 */
export function useRegisterCommandPaletteActions(group: string, actions: CommandPaletteAction[]) {
  const id = useId();
  const { register } = useCommandPaletteDispatch();

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Derive a stable dependency from serialisable action properties.
  // Callback identity changes are absorbed by the ref.
  const depsKey = actions.map((a) => `${a.key}\0${a.label}`).join("\n");

  useEffect(() => {
    return register(
      id,
      actionsRef.current.map((a) => ({
        ...a,
        group: a.group ?? group,
        onSelect: () => actionsRef.current.find((c) => c.key === a.key)?.onSelect(),
      })),
    );
  }, [id, register, depsKey, group]);
}

/**
 * Returns the current state of the CommandPalette context including
 * actions, search sources, and palette open state.
 *
 * @internal — used by the `CommandPalette` component and `DefaultSidebar`.
 */
export function useCommandPaletteState(): StateContextValue {
  const ctx = useContext(CommandPaletteStateContext);
  if (!ctx) {
    throw new Error("useCommandPaletteState must be used within CommandPaletteProvider");
  }
  return ctx;
}

/**
 * Returns the current list of contextual actions registered in the CommandPalette.
 *
 * @internal — used by the `CommandPalette` component to render actions.
 */
export function useCommandPaletteActions(): CommandPaletteAction[] {
  const ctx = useContext(CommandPaletteStateContext);
  if (!ctx) {
    throw new Error("useCommandPaletteActions must be used within CommandPaletteProvider");
  }
  return ctx.actions;
}
