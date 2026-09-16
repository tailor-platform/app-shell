import { describe, expect, it } from "vitest";
import * as appShell from "@/index";
import * as reactRouter from "react-router";

// Pins the surface that "apps never need react-router directly" rests on.

const CONSUMABLE = [
  "useLocation",
  "useParams",
  "useSearchParams",
  "useMatch",
  "useResolvedPath",
  "useNavigate",
  "useNavigation",
  "Link",
  "NavLink",
  "Navigate",
  "useBlocker",
  "useBeforeUnload",
  "useRouteError",
] as const;

// Router construction, and data APIs AppShell does not wire up.
const WITHHELD = [
  "createBrowserRouter",
  "createMemoryRouter",
  "RouterProvider",
  "MemoryRouter",
  "BrowserRouter",
  "Routes",
  "Route",
  "useLoaderData",
  "useActionData",
  "useRevalidator",
  "useSubmit",
  "useFetcher",
] as const;

describe("react-router surface", () => {
  it.each(CONSUMABLE)("re-exports %s", (name) => {
    expect(appShell).toHaveProperty(name);
  });

  it.each(CONSUMABLE)("%s is the same binding as react-router's", (name) => {
    // A mismatch means two module instances — the failure this prevents.
    expect(appShell[name]).toBe(reactRouter[name]);
  });

  it.each(WITHHELD)("does not re-export %s", (name) => {
    expect(appShell).not.toHaveProperty(name);
  });

  it("exports AppShell's own Form, not react-router's", () => {
    // Both packages export a `Form`; AppShell's must win the name.
    expect(appShell.Form).toBeDefined();
    expect(appShell.Form).not.toBe(reactRouter.Form);
  });
});

describe("routing mode is test-only", () => {
  it("is not reachable from the production entry point", async () => {
    const production = await import("@/index");
    const testing = await import("@/testing");

    expect(testing).toHaveProperty("TestRouter");
    expect(production).not.toHaveProperty("TestRouter");
  });
});
