/**
 * Vitest type tests for `AIChat`'s callback props.
 *
 * Each of these shares a name with a DOM handler inherited through
 * `ComponentProps<...>` — `onSubmit` on a div, `onSelect` on a button or nav,
 * `title` on a button. Without an explicit `Omit`, TypeScript intersects the
 * two signatures and the prop stops accepting the handler the component
 * actually calls: it type-checks here and fails at the call site.
 *
 * To run: `pnpm test`
 */

import type { ComponentProps } from "react";
import { describe, it, expectTypeOf } from "vitest";
import { AIChat, type AIChatAttachment, type AIChatProps } from "./ai-chat";

describe("AIChat callback prop types", () => {
  it("types onSubmit as (message, attachments), not a DOM submit handler", () => {
    expectTypeOf<NonNullable<AIChatProps["onSubmit"]>>().toEqualTypeOf<
      (message: string, attachments: AIChatAttachment[]) => void
    >();
  });

  it("types Suggestion's onSelect as (suggestion: string)", () => {
    expectTypeOf<NonNullable<ComponentProps<typeof AIChat.Suggestion>["onSelect"]>>().toEqualTypeOf<
      (suggestion: string) => void
    >();
  });

  it("types History's onSelect as (id: string)", () => {
    expectTypeOf<NonNullable<ComponentProps<typeof AIChat.History>["onSelect"]>>().toEqualTypeOf<
      (id: string) => void
    >();
  });

  it("types Source's title as the required display string, not the native tooltip", () => {
    expectTypeOf<ComponentProps<typeof AIChat.Source>["title"]>().toEqualTypeOf<string>();
  });
});
