import { cleanup, render, screen } from "@testing-library/react";
import {
  AppShell,
  defineModule,
  pass,
  useAppShell,
  useAppShellConfig,
  useAppShellData,
  useLocation,
  useParams,
} from "@tailor-platform/app-shell";
import {
  AppShell as LegacyAppShell,
  AppShellTestingProvider,
  TestRouter,
} from "@tailor-platform/app-shell/testing";
import { Outlet } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

afterEach(cleanup);

it("shares the testing provider with main-entry hooks and guard state", async () => {
  const before = window.location.pathname;
  const contextData = { token: "shared-runtime" };
  const guard = vi.fn(({ context }) => {
    expect(context).toEqual(contextData);
    return pass();
  });
  const Page = () => {
    const config = useAppShellConfig();
    const data = useAppShellData();
    const combined = useAppShell();
    return <div>{`${config.title}:${data.contextData.token}:${combined.contextData.token}`}</div>;
  };
  const modules = [
    defineModule({
      path: "probe",
      meta: { title: "Probe" },
      component: Page,
      resources: [],
      guards: [guard],
    }),
  ];

  render(
    <AppShellTestingProvider initialEntries={["/probe"]}>
      <AppShell modules={modules} title="Testing" contextData={contextData}>
        <Outlet />
      </AppShell>
    </AppShellTestingProvider>,
  );

  expect(await screen.findByText("Testing:shared-runtime:shared-runtime")).toBeDefined();
  expect(guard).toHaveBeenCalled();
  expect(window.location.pathname).toBe(before);
});

it("shares the testing provider with a configured main-entry AppShell", async () => {
  const before = window.location.pathname;
  const Page = () => {
    const { id } = useParams();
    const { pathname } = useLocation();
    return <div>{`configured:${id}:${pathname}`}</div>;
  };
  const ConfiguredShell = AppShell.WithPages([{ path: "/orders/:id", component: Page }]);

  render(
    <AppShellTestingProvider initialEntries={["/orders/42"]}>
      <ConfiguredShell>
        <Outlet />
      </ConfiguredShell>
    </AppShellTestingProvider>,
  );

  expect(await screen.findByText("configured:42:/orders/42")).toBeDefined();
  expect(window.location.pathname).toBe(before);
});

it.each(["memory", "browser"])(
  "keeps the deprecated AppShell's %s routing compatible with main-entry state",
  async (mode) => {
    const before = window.location.href;
    const historyState = window.history.state;
    const contextData = { token: "legacy-runtime" };
    const guard = vi.fn(({ context }) => {
      expect(context).toEqual(contextData);
      return pass();
    });
    const Page = () => {
      const config = useAppShellConfig();
      const { contextData: data } = useAppShell();
      const { pathname } = useLocation();
      return <div>{`${config.title}:${data.token}:${pathname}`}</div>;
    };
    const modules = [
      defineModule({
        path: "legacy-browser",
        meta: { title: "Legacy" },
        component: Page,
        resources: [],
        guards: [guard],
      }),
    ];
    if (mode === "browser") window.history.replaceState(null, "", "/legacy-browser");
    const routingProps =
      mode === "memory" ? { memory: true, initialEntries: ["/legacy-browser"] } : { memory: false };
    const { unmount } = render(
      <LegacyAppShell {...routingProps} modules={modules} title="Legacy" contextData={contextData}>
        <Outlet />
      </LegacyAppShell>,
    );
    try {
      expect(await screen.findByText("Legacy:legacy-runtime:/legacy-browser")).toBeDefined();
      expect(guard).toHaveBeenCalled();
      if (mode === "memory") expect(window.location.href).toBe(before);
      else expect(window.location.pathname).toBe("/legacy-browser");
    } finally {
      unmount();
      window.history.replaceState(historyState, "", before);
    }
  },
);

it.each([
  ["browser", { memory: false }, "/legacy-browser"],
  ["default", {}, "/legacy-browser"],
  ["memory", { memory: true, initialEntries: ["/legacy-memory"] }, "/legacy-memory"],
])(
  "keeps legacy %s routing independent of an outer testing provider",
  async (_mode, props, expected) => {
    const before = window.location.href;
    const historyState = window.history.state;
    const Page = () => <div>{useLocation().pathname}</div>;
    const modules = ["legacy-browser", "legacy-memory", "provider-memory"].map((path) =>
      defineModule({
        path,
        meta: { title: "Legacy" },
        component: Page,
        resources: [],
      }),
    );
    window.history.replaceState(null, "", "/legacy-browser");
    const { unmount } = render(
      <AppShellTestingProvider initialEntries={["/provider-memory"]}>
        <LegacyAppShell {...props} modules={modules}>
          <Outlet />
        </LegacyAppShell>
      </AppShellTestingProvider>,
    );
    try {
      expect(await screen.findByText(expected)).toBeDefined();
      expect(window.location.pathname).toBe("/legacy-browser");
    } finally {
      unmount();
      window.history.replaceState(historyState, "", before);
    }
  },
);

it("keeps TestRouter compatible with main-entry router hooks", async () => {
  const Page = () => {
    const { id } = useParams();
    const { pathname } = useLocation();
    return <div>{`${id}:${pathname}`}</div>;
  };

  render(
    <TestRouter
      path="/orders/:id"
      initialEntries={["/orders/42", "/orders/other"]}
      initialIndex={0}
    >
      <Page />
    </TestRouter>,
  );

  expect(await screen.findByText("42:/orders/42")).toBeDefined();
});
