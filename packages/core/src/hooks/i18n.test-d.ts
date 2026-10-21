import { describe, expectTypeOf, it } from "vitest";
import type { LocalizedString } from "@/lib/i18n";
import { defineI18nLabels } from "./i18n";

const labels = defineI18nLabels({
  en: {
    hello: "Hello",
    welcome: (props: { name: string }) => `Welcome, ${props.name}!`,
  },
  ja: {
    hello: "こんにちは",
    welcome: (props: { name: string }) => `ようこそ、${props.name}さん！`,
  },
});

declare const t: ReturnType<typeof labels.useT>;

describe("defineI18nLabels type contract", () => {
  it("requires an English base locale", () => {
    // @ts-expect-error English is the required base locale.
    defineI18nLabels({ ja: { hello: "こんにちは" } });
  });

  it("requires inferred locales to contain every base key", () => {
    defineI18nLabels({
      en: { hello: "Hello", goodbye: "Goodbye" },
      // @ts-expect-error The Japanese definition is missing goodbye.
      ja: { hello: "こんにちは" },
    });
  });

  it("requires translated functions to accept the base props", () => {
    defineI18nLabels({
      en: { welcome: (props: { name: string }) => `Welcome, ${props.name}!` },
      ja: {
        // @ts-expect-error The translated function must accept name, not count.
        welcome: (props: { count: number }) => `${props.count}人`,
      },
    });
  });

  it("rejects unknown keys on both typed resolvers", () => {
    // @ts-expect-error This key is not in the English definition.
    t("unknown");
    // @ts-expect-error This key is not in the English definition.
    labels.t("unknown");
  });

  it("requires correctly typed props for dynamic labels", () => {
    expectTypeOf(t("welcome", { name: "Alex" })).toEqualTypeOf<string>();
    expectTypeOf(labels.t("welcome", { name: "Alex" })).toEqualTypeOf<LocalizedString>();

    // @ts-expect-error Dynamic labels require props.
    t("welcome");
    // @ts-expect-error Dynamic labels require props.
    labels.t("welcome");
    // @ts-expect-error name must be a string.
    t("welcome", { name: 123 });
    // @ts-expect-error name must be a string.
    labels.t("welcome", { name: 123 });
  });

  it("forbids props on static labels", () => {
    expectTypeOf(t("hello")).toEqualTypeOf<string>();
    expectTypeOf(labels.t("hello")).toEqualTypeOf<LocalizedString>();

    // @ts-expect-error Static labels do not accept props.
    t("hello", {});
    // @ts-expect-error Static labels do not accept props.
    labels.t("hello", {});
  });
});
