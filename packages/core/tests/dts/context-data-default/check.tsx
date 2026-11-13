import { pass, type ContextData, type GuardContext } from "@tailor-platform/app-shell";
import { AppShell, type TestAppShellProps } from "@tailor-platform/app-shell/testing";

// This case must compile independently of fixtures that augment AppShellRegister.
export const contextData: ContextData = { arbitrary: true };
export const testingContext: NonNullable<TestAppShellProps["contextData"]> = contextData;
export const mainGuardContext: GuardContext = { context: contextData };

export const shell = (
  <AppShell
    contextData={{ arbitrary: true }}
    rootGuards={[
      ({ context }) => {
        const value: unknown = context.arbitrary;
        // @ts-expect-error Without augmentation, context values are unknown, not any.
        const invalidValue: string = context.arbitrary;
        void [value, invalidValue];
        return pass();
      },
    ]}
  />
);
