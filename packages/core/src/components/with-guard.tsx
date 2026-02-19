import { type ReactNode, Suspense, useRef } from "react";
import { useAppShell, type ContextData } from "@/contexts/appshell-context";
import type { GuardResult } from "@/resource";

// ============================================
// Promise state cache for Suspense integration
// ============================================

type PromiseState<T> =
  | { status: "pending"; promise: Promise<T> }
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown };

const promiseStateCache = new WeakMap<Promise<unknown>, PromiseState<unknown>>();

/**
 * Track a promise and cache its state.
 * Returns cached result if already resolved, otherwise throws to suspend.
 */
function usePromiseValue<T>(promise: Promise<T>): T {
  let state = promiseStateCache.get(promise) as PromiseState<T> | undefined;

  if (!state) {
    // First time seeing this promise - start tracking
    state = { status: "pending", promise };
    promiseStateCache.set(promise, state);

    promise.then(
      (value) => {
        if (state!.status === "pending") {
          const fulfilledState: PromiseState<T> = { status: "fulfilled", value };
          promiseStateCache.set(promise, fulfilledState);
        }
      },
      (error) => {
        if (state!.status === "pending") {
          const rejectedState: PromiseState<T> = { status: "rejected", error };
          promiseStateCache.set(promise, rejectedState);
        }
      },
    );
  }

  switch (state.status) {
    case "fulfilled":
      return state.value;
    case "rejected":
      throw state.error;
    case "pending":
      throw state.promise; // Suspend
  }
}

/**
 * Context provided to component guards.
 * Simplified version of GuardContext for use outside of route loaders.
 */
export type WithGuardContext = {
  context: ContextData;
};

/**
 * Guard function type for WithGuard component.
 * Unlike route guards, this only receives contextData (no params/searchParams/signal).
 */
export type WithGuardComponentGuard = (
  ctx: WithGuardContext,
) => Promise<GuardResult> | GuardResult;

export type WithGuardProps = {
  /**
   * Guards to evaluate. All guards must pass for children to render.
   */
  guards: WithGuardComponentGuard[];

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

  // Use ref to cache the promise across re-renders
  // This ensures the same promise instance is used for Suspense tracking
  const promiseRef = useRef<{
    guards: WithGuardComponentGuard[];
    contextData: ContextData;
    promise: Promise<GuardResult>;
  } | null>(null);

  // Create new promise only when guards or contextData changes
  if (
    !promiseRef.current ||
    promiseRef.current.guards !== guards ||
    promiseRef.current.contextData !== contextData
  ) {
    promiseRef.current = {
      guards,
      contextData,
      promise: runComponentGuards(guards, contextData),
    };
  }

  return (
    <Suspense fallback={loading}>
      <GuardResolver
        guardPromise={promiseRef.current.promise}
        children={children}
        fallback={fallback}
      />
    </Suspense>
  );
};

/**
 * Internal component that resolves the guard promise using Suspense.
 */
const GuardResolver = (props: {
  guardPromise: Promise<GuardResult>;
  children: ReactNode;
  fallback: ReactNode;
}) => {
  const result = usePromiseValue(props.guardPromise);

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
  guards: WithGuardComponentGuard[],
  contextData: ContextData,
): Promise<GuardResult> => {
  const ctx: WithGuardContext = { context: contextData };

  for (const guard of guards) {
    const result = await guard(ctx);
    if (result.type !== "pass") {
      return result;
    }
  }

  return { type: "pass" };
};
