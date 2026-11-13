import { cleanup, render, screen } from "@testing-library/react";
import {
  defineModule,
  pass,
  useAppShell,
  useAppShellConfig,
  useAppShellData,
  useLocation,
  useParams,
  type GuardContext,
} from "@tailor-platform/app-shell";
import { AppShell, TestRouter } from "@tailor-platform/app-shell/testing";
import { Outlet } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

afterEach(cleanup);

it("shares testing providers and guard state with main-entry hooks and modules", async () => {
  const contextData = { token: "shared-runtime" };
  const guard = vi.fn(({ context }: GuardContext) => {
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
    <AppShell
      modules={modules}
      memory
      initialEntries={["/probe"]}
      title="Testing"
      contextData={contextData}
    >
      <Outlet />
    </AppShell>,
  );

  expect(await screen.findByText("Testing:shared-runtime:shared-runtime")).toBeDefined();
  expect(guard).toHaveBeenCalled();
});

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
