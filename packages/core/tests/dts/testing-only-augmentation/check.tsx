import { AppShell, type TestAppShellProps } from "@tailor-platform/app-shell/testing";

declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: { currentUser: { id: string } };
  }
}

export const props: TestAppShellProps = {
  memory: true,
  initialEntries: ["/"],
  contextData: { currentUser: { id: "user-1" } },
};

export const shell = (
  <AppShell
    {...props}
    rootGuards={[
      (ctx) => {
        const id: string = ctx.context.currentUser.id;
        // @ts-expect-error The testing-only import must still apply main augmentation.
        const invalid: number = ctx.context.currentUser.id;
        void [id, invalid];
        return { type: "pass" };
      },
    ]}
  />
);

// @ts-expect-error Augmentation must reject an invalid contextData prop.
export const invalid = <AppShell contextData={{ currentUser: { id: 123 } }} />;
