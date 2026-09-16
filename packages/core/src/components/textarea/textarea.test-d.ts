/**
 * Vitest type tests for `TextareaProps`.
 *
 * Both fixes these pin are type-only, so they are invisible to the runtime
 * tests: the old signature accepted `wrap` and a function `className`, both of
 * which type-checked and then silently did nothing at runtime.
 *
 * To run: `pnpm test`
 */

import type * as React from "react";
import { describe, it, expectTypeOf } from "vitest";
import type { TextareaProps } from "./textarea";

describe("TextareaProps", () => {
  it("types className as a plain string only", () => {
    // Base UI types `className` as `string | ((state) => string | undefined)`,
    // but it is merged through `cn()`, which drops functions. Accepting the
    // function form would type-check and then apply nothing.
    expectTypeOf<TextareaProps["className"]>().toEqualTypeOf<string | undefined>();
  });

  it("exposes rows, the height knob that actually works", () => {
    expectTypeOf<TextareaProps>().toHaveProperty("rows");
    expectTypeOf<TextareaProps["rows"]>().toEqualTypeOf<number | undefined>();
  });

  it("does not expose cols or wrap, which cannot take effect on a w-full control", () => {
    // `cols` loses to `w-full`; every `wrap` value depends on `cols` being set.
    expectTypeOf<TextareaProps>().not.toHaveProperty("cols");
    expectTypeOf<TextareaProps>().not.toHaveProperty("wrap");
  });

  it("does not expose render — the component owns the textarea tag", () => {
    expectTypeOf<TextareaProps>().not.toHaveProperty("render");
  });

  it("types onChange against the textarea element, not the input default", () => {
    expectTypeOf<NonNullable<TextareaProps["onChange"]>>().toEqualTypeOf<
      React.ChangeEventHandler<HTMLTextAreaElement>
    >();
  });
});
