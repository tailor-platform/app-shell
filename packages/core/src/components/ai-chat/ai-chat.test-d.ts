/**
 * Vitest type tests for `AIChat`'s public prop surface.
 *
 * Two things are pinned here. First, callback props whose names collide with
 * an inherited DOM handler (`onSelect` on a button or nav, `title` on a
 * button): without an explicit `Omit`, TypeScript intersects the two
 * signatures and the prop stops accepting the handler the component calls.
 * Second, which region owns which prop — the root carries only `status`, so
 * moving a prop back onto it has to be deliberate.
 *
 * To run: `pnpm test`
 */

import type { ComponentProps, ReactNode } from "react";
import { describe, it, expectTypeOf } from "vitest";
import {
  AIChat,
  type AIChatAttachment,
  type AIChatComposerProps,
  type AIChatHeaderProps,
  type AIChatProps,
} from "./ai-chat";

describe("region ownership", () => {
  it("keeps the root to status (plus div props) — the regions own the rest", () => {
    expectTypeOf<AIChatProps>().toHaveProperty("status");
    // `onSubmit` and `title` are native div attributes, so they are present —
    // but as DOM types, not AIChat's. The Composer/Header tests below pin
    // where the AIChat versions live.
    expectTypeOf<AIChatProps>().not.toHaveProperty("actions");
    expectTypeOf<AIChatProps>().not.toHaveProperty("autoScroll");
    expectTypeOf<AIChatProps>().not.toHaveProperty("composerActions");
  });

  it("types Composer's onSubmit as (message, attachments), not a DOM submit handler", () => {
    expectTypeOf<AIChatComposerProps["onSubmit"]>().toEqualTypeOf<
      (message: string, attachments: AIChatAttachment[]) => void
    >();
  });

  it("types Header's title as content", () => {
    expectTypeOf<AIChatHeaderProps["title"]>().toEqualTypeOf<ReactNode>();
  });
});

describe("callback names that collide with DOM handlers", () => {
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
