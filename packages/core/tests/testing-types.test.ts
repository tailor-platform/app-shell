import { expectTypeOf, it } from "vitest";
import type { AppShellInternal, AppShellInternalProps } from "../src/components/appshell/appshell";
import type {
  TestRouter as RuntimeTestRouter,
  TestRouterProps as RuntimeTestRouterProps,
} from "../src/testing/test-router";
import type { AppShell, TestAppShellProps, TestRouter, TestRouterProps } from "../testing";

it("keeps the testing entry aligned with its internal runtime exports", () => {
  expectTypeOf<typeof AppShell>().toExtend<typeof AppShellInternal>();
  expectTypeOf<typeof AppShellInternal>().toExtend<typeof AppShell>();
  expectTypeOf<TestAppShellProps>().toEqualTypeOf<AppShellInternalProps>();
  expectTypeOf<typeof TestRouter>().toEqualTypeOf<typeof RuntimeTestRouter>();
  expectTypeOf<TestRouterProps>().toEqualTypeOf<RuntimeTestRouterProps>();
});
