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

import type { ComponentProps, ReactNode } from "react";
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

  it("types the root's title as header content, not the native tooltip attribute", () => {
    expectTypeOf<AIChatProps["title"]>().toEqualTypeOf<ReactNode>();
  });
});

// These three wrap a Button or a Badge. They Pick what the part's job needs
// rather than inheriting, so the wrapped component's surface cannot leak out
// and become contract we did not intend to offer.
describe("wrapper parts expose only picked props", () => {
  it("keeps Suggestion to its own props plus className/disabled/children", () => {
    expectTypeOf<keyof ComponentProps<typeof AIChat.Suggestion>>().toEqualTypeOf<
      "className" | "disabled" | "children" | "suggestion" | "onSelect"
    >();
  });

  it("keeps Action to its own label plus className/disabled/children/onClick", () => {
    expectTypeOf<keyof ComponentProps<typeof AIChat.Action>>().toEqualTypeOf<
      "className" | "disabled" | "children" | "onClick" | "label"
    >();
  });

  it("keeps ChainOfThoughtSearchResult to className/children/variant", () => {
    expectTypeOf<keyof ComponentProps<typeof AIChat.ChainOfThoughtSearchResult>>().toEqualTypeOf<
      "className" | "children" | "variant"
    >();
  });
});
