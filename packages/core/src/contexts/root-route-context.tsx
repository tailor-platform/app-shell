import { createContext, useContext } from "react";

/** @internal */
export type RootRouteLoaderFn = (requestUrl: URL) => Promise<Response | null>;

/** @internal */
export type RootRouteContextType = {
  /**
   * Runs in the react-router loader phase (before rendering).
   * Used for side effects such as OAuth callback handling.
   *
   * ```
   * loader runs  ──▶  rendering starts  ──▶  wrapComponent applied
   * (pre-render)       (React lifecycle)      (render phase)
   * ```
   */
  loader: RootRouteLoaderFn;
  /**
   * Wraps the root route element during the React render phase.
   * Used for UI concerns such as showing a guard component while
   * auth is loading or the user is unauthenticated.
   *
   * ```
   * loader runs  ──▶  rendering starts  ──▶  wrapComponent applied
   * (pre-render)       (React lifecycle)      (render phase)
   * ```
   */
  wrapComponent?: (children: React.ReactNode) => React.ReactNode;
};

/**
 * Internal context that allows providers (e.g. AuthProvider) to inject
 * a loader function and an optional element wrapper into the router's
 * root route. The router does not need to know which provider supplied
 * the value — it only consumes this interface.
 *
 * Currently the only provider is AuthProvider. If additional providers
 * need to participate in root loading in the future, a composition
 * mechanism (e.g. accepting an array of loaders, or merging multiple
 * contexts) would need to be introduced, since a single React context
 * only holds one value.
 * @internal
 */
export const RootRouteContext = createContext<RootRouteContextType | null>(null);

/**
 * Internal hook consumed by RouterContainer to obtain the root route
 * context. Returns null when no provider (e.g. AuthProvider) supplies
 * a value, making the integration optional.
 * @internal
 */
export const useRootRouteContext = (): RootRouteContextType | null => {
  return useContext(RootRouteContext);
};
