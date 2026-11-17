import {
  AppShell,
  defineModule,
  pass,
  type AppShellProps,
  type Guard,
  type GuardContext,
} from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

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

export const props: AppShellProps = {
  modules,
  contextData: { currentUser: { id: "user-1" } },
  rootGuards: [guard],
};

export const shell = (
  <AppShellTestingProvider initialEntries={["/dashboard"]}>
    <AppShell
      modules={modules}
      contextData={{ currentUser: { id: "user-1" } }}
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
  </AppShellTestingProvider>
);

const invalidData = { currentUser: { id: 123 } };
// @ts-expect-error Augmentation must reject an invalid AppShell contextData prop.
export const invalidContext = <AppShell contextData={invalidData} />;
