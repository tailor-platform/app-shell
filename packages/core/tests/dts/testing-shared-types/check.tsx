import {
  AppShell as ProductionAppShell,
  defineModule,
  pass,
  type Guard,
  type GuardContext,
} from "@tailor-platform/app-shell";
import {
  AppShell,
  TestRouter,
  type TestAppShellProps,
  type TestRouterProps,
} from "@tailor-platform/app-shell/testing";

declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: { currentUser: { id: string } };
  }
}

const guard: Guard = ({ context }) => {
  const id: string = context.currentUser.id;
  void id;
  return pass();
};

const modules = [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard" },
    resources: [],
    guards: [guard],
  }),
];

export const props: TestAppShellProps = {
  modules,
  contextData: { currentUser: { id: "user-1" } },
  rootGuards: [guard],
  memory: true,
  initialEntries: ["/dashboard"],
};

export const shell = (
  <AppShell
    modules={modules}
    contextData={{ currentUser: { id: "user-1" } }}
    memory
    initialEntries={["/dashboard"]}
    rootGuards={[
      (ctx) => {
        const mainContext: GuardContext = ctx;
        const id: string = ctx.context.currentUser.id;
        // @ts-expect-error The augmented id is a string, not any.
        const invalidId: number = ctx.context.currentUser.id;
        // @ts-expect-error Unknown properties must not become any.
        void ctx.context.missing;
        void [mainContext, id, invalidId];
        return pass();
      },
    ]}
  />
);

// @ts-expect-error Augmentation must also constrain testing's contextData prop.
export const invalidContext = <AppShell contextData={{ currentUser: { id: 123 } }} />;
// @ts-expect-error Memory routing requires an initial history stack.
export const missingEntries = <AppShell memory />;
// @ts-expect-error Production AppShell must not accept memory routing.
export const productionMemory = <ProductionAppShell memory initialEntries={["/"]} />;

export const withPages: typeof ProductionAppShell.WithPages = AppShell.WithPages;
const ConfiguredShell = AppShell.WithPages([]);
export const configuredShell = <ConfiguredShell contextData={{ currentUser: { id: "user-1" } }} />;

export const routerProps: TestRouterProps = {
  path: "/dashboard",
  initialEntries: ["/dashboard"],
  initialIndex: 0,
};
export const router = <TestRouter {...routerProps}>Dashboard</TestRouter>;
