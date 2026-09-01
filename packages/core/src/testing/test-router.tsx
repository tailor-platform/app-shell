import { MemoryRouter, Route, Routes } from "react-router";
import type { PropsWithChildren } from "react";

export type TestRouterProps = PropsWithChildren<{
  /** History stack; the last entry is the current location. Defaults to `["/"]`. */
  initialEntries?: Array<string>;
  /** Index into `initialEntries` to start at. Defaults to the last entry. */
  initialIndex?: number;
  /**
   * Route pattern to match the children against, e.g. `"/orders/:id"`.
   *
   * Required for `useParams`, `useMatch`, or relative `<Link>` targets: a router
   * on its own matches nothing, so without this `useParams()` is `{}` even when
   * `initialEntries` holds a URL that looks like it should match.
   */
  path?: string;
}>;

/**
 * Router context for unit-testing a single component, without booting the whole
 * shell. For a page or integration test, mount `AppShell` with `memory`
 * instead, so the test exercises AppShell's own router.
 *
 * ```tsx
 * render(
 *   <TestRouter path="/orders/:id" initialEntries={["/orders/A42"]}>
 *     <OrderBadge />
 *   </TestRouter>,
 * );
 * ```
 */
export const TestRouter = ({
  children,
  initialEntries = ["/"],
  initialIndex,
  path,
}: TestRouterProps) => (
  <MemoryRouter
    initialEntries={initialEntries}
    {...(initialIndex === undefined ? {} : { initialIndex })}
  >
    {path === undefined ? (
      children
    ) : (
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    )}
  </MemoryRouter>
);
