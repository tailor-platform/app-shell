import { type ReactNode, Suspense, useRef } from "react";
import { useAppShell, type ContextData } from "@/contexts/appshell-context";
import type { Guard, GuardContext, GuardResult } from "@/resource";

// ============================================
// Guard evaluation cache for Suspense integration
// ============================================

type PromiseState<T> =
  | { status: "pending"; promise: Promise<T> }
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown };

type GuardCache = {
  contextData: ContextData;
  promise: Promise<GuardResult>;
  state: PromiseState<GuardResult>;
};

/**
 * Evaluate guards and return the result via Suspense.
 * Re-evaluates only when contextData reference changes.
 * The cache ref must be owned by a component outside the Suspense boundary
 * so that it persists across suspensions.
 */
function useGuardCache(
  guards: Guard[],
  contextData: ContextData,
  cacheRef: React.RefObject<GuardCache | null>,
): GuardCache {
  if (
    cacheRef.current === null ||
    cacheRef.current.contextData !== contextData
  ) {
    const promise = runComponentGuards(guards, contextData);
    const entry: GuardCache = {
      contextData,
      promise,
      state: { status: "pending", promise },
    };
    promise.then(
      (value) => {
        entry.state = { status: "fulfilled", value };
      },
      (error) => {
        entry.state = { status: "rejected", error };
      },
    );
    cacheRef.current = entry;
  }

  return cacheRef.current;
}

/**
 * Read the guard result from the cache, suspending if still pending.
 */
function readGuardResult(cache: GuardCache): GuardResult {
  const { state } = cache;
  switch (state.status) {
    case "fulfilled":
      return state.value;
    case "rejected":
      throw state.error;
    case "pending":
      throw state.promise; // Suspend
  }
}

export type WithGuardProps = {
  /**
   * Guards to evaluate. All guards must pass for children to render.
   * Uses the same Guard type as route guards for full reusability.
   */
  guards: Guard[];

  /**
   * Content to render when all guards pass.
   */
  children: ReactNode;

  /**
   * Content to render when any guard returns hidden.
   * @default null (renders nothing)
   */
  fallback?: ReactNode;

  /**
   * Content to render while guards are being evaluated (for async guards).
   * @default null (renders nothing)
   */
  loading?: ReactNode;
};

/**
 * Conditionally render children based on guard evaluation.
 *
 * Guards are evaluated in order. If any guard returns `hidden()`,
 * the fallback is rendered instead of children. Supports async guards.
 *
 * Note: Unlike route guards, `redirectTo()` is not supported in WithGuard.
 * Use `hidden()` with a fallback that handles navigation if needed.
 *
 * @example
 * ```tsx
 * // Simple role-based guard
 * const isAdmin = ({ context }) =>
 *   context.currentUser.role === "admin" ? pass() : hidden();
 *
 * <WithGuard guards={[isAdmin]}>
 *   <AdminPanel />
 * </WithGuard>
 *
 * // With fallback
 * <WithGuard guards={[isAdmin]} fallback={<UpgradePrompt />}>
 *   <AdminPanel />
 * </WithGuard>
 *
 * // Parameterized guard (curried)
 * const isOwner = (resourceId: string) => ({ context }) =>
 *   resourceId === context.currentUser.id ? pass() : hidden();
 *
 * const { id } = useParams();
 * <WithGuard guards={[isOwner(id)]}>
 *   <EditButton />
 * </WithGuard>
 *
 * // In sidebar
 * <DefaultSidebar>
 *   <SidebarItem to="/dashboard" />
 *   <WithGuard guards={[isAdmin]}>
 *     <SidebarItem to="/admin" />
 *   </WithGuard>
 * </DefaultSidebar>
 * ```
 */
export const WithGuard = (props: WithGuardProps) => {
  const { guards, children, fallback = null, loading = null } = props;
  const { contextData } = useAppShell();

  // Cache ref lives here (outside Suspense) so it persists across suspensions
  const cacheRef = useRef<GuardCache | null>(null);
  const cache = useGuardCache(guards, contextData, cacheRef);

  return (
    <Suspense fallback={loading}>
      <GuardResolver cache={cache} children={children} fallback={fallback} />
    </Suspense>
  );
};

/**
 * Internal component that reads the guard result and renders children or fallback.
 * Suspends while async guards are being evaluated.
 */
const GuardResolver = (props: {
  cache: GuardCache;
  children: ReactNode;
  fallback: ReactNode;
}) => {
  const result = readGuardResult(props.cache);

  if (result.type === "pass") {
    return <>{props.children}</>;
  }

  // For hidden or redirect, render fallback
  return <>{props.fallback}</>;
};

/**
 * Run component guards and return the result.
 * Guards are executed in order; stops on first non-pass result.
 */
const runComponentGuards = async (
  guards: Guard[],
  contextData: ContextData,
): Promise<GuardResult> => {
  const ctx: GuardContext = { context: contextData };

  for (const guard of guards) {
    const result = await guard(ctx);
    if (result.type !== "pass") {
      return result;
    }
  }

  return { type: "pass" };
};
