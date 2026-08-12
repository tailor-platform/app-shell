import { describe, expect, it } from "vitest";
import * as reactRouter from "react-router";
import * as appShell from "./index";

// AppShell owns the application's RouterProvider, so consumers must reach
// react-router primitives through this package rather than a direct
// dependency: a second react-router instance reads a different context and
// throws "useNavigate() may be used only in the context of a <Router>" at
// runtime, with type-check and build both staying green.
//
// Kept in its own file because it imports the whole public barrel — folding
// that into a focused unit test would drag the entire library into its module
// graph and slow it down for no benefit.
describe("react-router re-exports", () => {
  const reExported = [
    "useLocation",
    "useNavigate",
    "useParams",
    "useSearchParams",
    "useRouteError",
    "Link",
    "Navigate",
  ] as const;

  it.each(reExported)("re-exports %s as the same instance react-router provides", (name) => {
    expect(appShell[name]).toBe(reactRouter[name]);
  });
});
