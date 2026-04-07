import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * An action entry displayed in the CommandPalette.
 *
 * Actions registered via `useCommandPaletteDispatch` (or implicitly through
 * `ActionPanel`) appear in the "Actions" section of the palette and are
 * searchable by `label`.
 */
export type CommandPaletteAction = {
  /** Unique key for React reconciliation */
  key: string;
  /** Visible label shown in the palette (also used for search matching) */
  label: string;
  /** Optional icon rendered next to the label */
  icon?: ReactNode;
  /** Group name used to categorise the action (e.g. the ActionPanel title) */
  group: string;
  /** Callback invoked when the action is selected */
  onSelect: () => void | Promise<void>;
};

type DispatchContextValue = {
  register: (sourceId: string, actions: CommandPaletteAction[]) => () => void;
};

type StateContextValue = {
  actions: CommandPaletteAction[];
};

const CommandPaletteDispatchContext = createContext<DispatchContextValue | null>(null);
const CommandPaletteStateContext = createContext<StateContextValue | null>(null);

/**
 * Provider that manages contextual actions for the CommandPalette.
 *
 * Placed inside `AppShell`; consumers register/unregister actions via
 * `useCommandPaletteDispatch`, and the `CommandPalette` component reads
 * them via `useCommandPaletteActions`.
 *
 * @internal — mounted automatically by AppShell; not intended for direct use.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef(new Map<string, CommandPaletteAction[]>());
  const [actions, setActions] = useState<CommandPaletteAction[]>([]);

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

  const dispatchValue = useMemo(() => ({ register }), [register]);
  const stateValue = useMemo(() => ({ actions }), [actions]);

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
 * `register(sourceId, actions)` returns an unregister function that removes
 * the actions — perfect for `useEffect` cleanup. Registering with the same
 * `sourceId` again replaces the previous set.
 *
 * `ActionPanel` uses this internally, but you can call it directly to
 * register actions from any component.
 *
 * @example
 * ```tsx
 * import { useCommandPaletteDispatch } from "@tailor-platform/app-shell";
 *
 * function MyComponent() {
 *   const id = useId();
 *   const { register } = useCommandPaletteDispatch();
 *
 *   useEffect(() => {
 *     return register(id, [
 *       {
 *         key: "refresh",
 *         label: "Refresh data",
 *         group: "My Page",
 *         onSelect: () => refetch()
 *       },
 *     ]);
 *   }, [id, register]);
 * }
 * ```
 */
export function useCommandPaletteDispatch(): DispatchContextValue {
  const ctx = useContext(CommandPaletteDispatchContext);
  if (!ctx) {
    throw new Error("useCommandPaletteDispatch must be used within CommandPaletteProvider");
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
