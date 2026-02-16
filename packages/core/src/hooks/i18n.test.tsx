import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import {
  AppShellConfigContext,
  AppShellDataContext,
  buildConfigurations,
} from "@/contexts/appshell-context";
import { defineModule, defineResource, type Module } from "@/resource";
import { defineI18nLabels } from "./i18n";
import { Outlet } from "react-router";
import { RouterContainer } from "@/routing/router";
import type { ReactNode } from "react";

afterEach(() => {
  cleanup();
});

const labels = defineI18nLabels({
  en: {
    hello: "Hello",
    greeting: "Good morning",
    moduleTitle: "Dashboard",
    resourceTitle: "Overview",
  },
  ja: {
    hello: "こんにちは",
    greeting: "おはようございます",
    moduleTitle: "ダッシュボード",
    resourceTitle: "概要",
  },
});

const createWrapper = (locale: string) => {
  const configurations = buildConfigurations({
    modules: [],
    locale,
  });

  return ({ children }: { children: ReactNode }) => (
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData: {} }}>
        {children}
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>
  );
};

const renderWithConfig = ({
  modules = [],
  locale,
  initialEntries,
}: {
  modules?: Array<Module>;
  locale?: string;
  initialEntries: Array<string>;
}) => {
  const configurations = buildConfigurations({
    modules,
    locale,
  });

  render(
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData: {} }}>
        <RouterContainer memory initialEntries={initialEntries}>
          <Outlet />
        </RouterContainer>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>,
  );
};

describe("defineI18nLabels", () => {
  describe("useT hook", () => {
    it("returns English label when locale is 'en'", () => {
      const { result } = renderHook(() => labels.useT(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current("hello")).toBe("Hello");
      expect(result.current("greeting")).toBe("Good morning");
    });

    it("returns Japanese label when locale is 'ja'", () => {
      const { result } = renderHook(() => labels.useT(), {
        wrapper: createWrapper("ja"),
      });

      expect(result.current("hello")).toBe("こんにちは");
      expect(result.current("greeting")).toBe("おはようございます");
    });

    it("falls back to English when locale is not defined in labels", () => {
      const { result } = renderHook(() => labels.useT(), {
        wrapper: createWrapper("fr"),
      });

      expect(result.current("hello")).toBe("Hello");
      expect(result.current("greeting")).toBe("Good morning");
    });
  });

  describe("labels.t() for meta.title", () => {
    it("resolves English title in module meta when locale is 'en'", async () => {
      const module = defineModule({
        path: "dashboard",
        component: (props) => <div data-testid="title">{props.title}</div>,
        meta: { title: labels.t("moduleTitle") },
        resources: [],
      });

      renderWithConfig({
        modules: [module],
        locale: "en",
        initialEntries: ["/dashboard"],
      });

      const element = await screen.findByTestId("title");
      expect(element.textContent).toBe("Dashboard");
    });

    it("resolves Japanese title in module meta when locale is 'ja'", async () => {
      const module = defineModule({
        path: "dashboard",
        component: (props) => <div data-testid="title">{props.title}</div>,
        meta: { title: labels.t("moduleTitle") },
        resources: [],
      });

      renderWithConfig({
        modules: [module],
        locale: "ja",
        initialEntries: ["/dashboard"],
      });

      const element = await screen.findByTestId("title");
      expect(element.textContent).toBe("ダッシュボード");
    });

    it("resolves English title in resource meta when locale is 'en'", async () => {
      const resource = defineResource({
        path: "overview",
        component: (props) => <div data-testid="title">{props.title}</div>,
        meta: { title: labels.t("resourceTitle") },
      });

      const module = defineModule({
        path: "dashboard",
        component: () => <Outlet />,
        meta: { title: "Dashboard" },
        resources: [resource],
      });

      renderWithConfig({
        modules: [module],
        locale: "en",
        initialEntries: ["/dashboard/overview"],
      });

      const element = await screen.findByTestId("title");
      expect(element.textContent).toBe("Overview");
    });

    it("resolves Japanese title in resource meta when locale is 'ja'", async () => {
      const resource = defineResource({
        path: "overview",
        component: (props) => <div data-testid="title">{props.title}</div>,
        meta: { title: labels.t("resourceTitle") },
      });

      const module = defineModule({
        path: "dashboard",
        component: () => <Outlet />,
        meta: { title: "Dashboard" },
        resources: [resource],
      });

      renderWithConfig({
        modules: [module],
        locale: "ja",
        initialEntries: ["/dashboard/overview"],
      });

      const element = await screen.findByTestId("title");
      expect(element.textContent).toBe("概要");
    });
  });

  describe("combined useT and labels.t()", () => {
    it("both useT hook and meta.title resolve correctly for the same locale", async () => {
      const resource = defineResource({
        path: "overview",
        component: (props) => {
          const t = labels.useT();
          return (
            <div>
              <div data-testid="meta-title">{props.title}</div>
              <div data-testid="hook-label">{t("hello")}</div>
            </div>
          );
        },
        meta: { title: labels.t("resourceTitle") },
      });

      const module = defineModule({
        path: "dashboard",
        component: () => <Outlet />,
        meta: { title: labels.t("moduleTitle") },
        resources: [resource],
      });

      renderWithConfig({
        modules: [module],
        locale: "ja",
        initialEntries: ["/dashboard/overview"],
      });

      const metaTitle = await screen.findByTestId("meta-title");
      const hookLabel = await screen.findByTestId("hook-label");

      expect(metaTitle.textContent).toBe("概要");
      expect(hookLabel.textContent).toBe("こんにちは");
    });
  });

  describe("labels.t() function", () => {
    it("returns a function that resolves to English for 'en' locale", () => {
      const titleFn = labels.t("moduleTitle");
      expect(typeof titleFn).toBe("function");
      expect((titleFn as (locale: string) => string)("en")).toBe("Dashboard");
    });

    it("returns a function that resolves to Japanese for 'ja' locale", () => {
      const titleFn = labels.t("resourceTitle");
      expect(typeof titleFn).toBe("function");
      expect((titleFn as (locale: string) => string)("ja")).toBe("概要");
    });

    it("falls back to English for undefined locale", () => {
      const titleFn = labels.t("hello");
      expect((titleFn as (locale: string) => string)("fr")).toBe("Hello");
    });
  });

  describe("dynamic labels with props", () => {
    const dynamicLabels = defineI18nLabels({
      en: {
        static: "Hello",
        welcome: (props: { name: string }) => `Welcome, ${props.name}!`,
        itemCount: (props: { count: number }) =>
          props.count === 1 ? "1 item" : `${props.count} items`,
      },
      ja: {
        static: "こんにちは",
        welcome: (props: { name: string }) => `ようこそ、${props.name}さん！`,
        itemCount: (props: { count: number }) => `${props.count}件`,
      },
    });

    it("resolves static label without props", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("en"),
      });
      expect(result.current("static")).toBe("Hello");
    });

    it("resolves dynamic label with props in English", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("en"),
      });
      expect(result.current("welcome", { name: "John" })).toBe(
        "Welcome, John!",
      );
    });

    it("resolves dynamic label with props in Japanese", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("ja"),
      });
      expect(result.current("welcome", { name: "太郎" })).toBe(
        "ようこそ、太郎さん！",
      );
    });

    it("resolves dynamic label with number props", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("en"),
      });
      expect(result.current("itemCount", { count: 1 })).toBe("1 item");
      expect(result.current("itemCount", { count: 5 })).toBe("5 items");
    });

    it("resolves Japanese dynamic label with number props", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("ja"),
      });
      expect(result.current("itemCount", { count: 3 })).toBe("3件");
    });

    it("falls back to English for dynamic labels when locale is not defined", () => {
      const { result } = renderHook(() => dynamicLabels.useT(), {
        wrapper: createWrapper("fr"),
      });
      expect(result.current("welcome", { name: "Pierre" })).toBe(
        "Welcome, Pierre!",
      );
    });

    describe("labels.t() with dynamic labels", () => {
      it("resolves dynamic label with props for English locale", () => {
        const titleFn = dynamicLabels.t("welcome", { name: "John" });
        expect(typeof titleFn).toBe("function");
        expect((titleFn as (locale: string) => string)("en")).toBe(
          "Welcome, John!",
        );
      });

      it("resolves dynamic label with props for Japanese locale", () => {
        const titleFn = dynamicLabels.t("welcome", { name: "太郎" });
        expect((titleFn as (locale: string) => string)("ja")).toBe(
          "ようこそ、太郎さん！",
        );
      });

      it("resolves dynamic label with number props", () => {
        const titleFn = dynamicLabels.t("itemCount", { count: 5 });
        expect((titleFn as (locale: string) => string)("en")).toBe("5 items");
        expect((titleFn as (locale: string) => string)("ja")).toBe("5件");
      });

      it("falls back to English for dynamic labels when locale is not defined", () => {
        const titleFn = dynamicLabels.t("welcome", { name: "Pierre" });
        expect((titleFn as (locale: string) => string)("fr")).toBe(
          "Welcome, Pierre!",
        );
      });
    });
  });
});

describe("AppShell browser locale detection", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  const localeLabels = defineI18nLabels({
    en: {
      title: "English Title",
    },
    ja: {
      title: "日本語タイトル",
    },
    fr: {
      title: "Titre Français",
    },
  });

  it("uses browser locale when locale prop is not provided", async () => {
    vi.stubGlobal("navigator", {
      languages: ["ja-JP", "en-US"],
      language: "ja-JP",
    });

    const module = defineModule({
      path: "test",
      component: () => {
        const t = localeLabels.useT();
        return <div data-testid="label">{t("title")}</div>;
      },
      meta: { title: "Test" },
      resources: [],
    });

    renderWithConfig({
      modules: [module],
      initialEntries: ["/test"],
    });

    const element = await screen.findByTestId("label");
    expect(element.textContent).toBe("日本語タイトル");
  });

  it("uses explicit locale prop over browser locale", async () => {
    vi.stubGlobal("navigator", {
      languages: ["ja-JP", "en-US"],
      language: "ja-JP",
    });

    const module = defineModule({
      path: "test",
      component: () => {
        const t = localeLabels.useT();
        return <div data-testid="label">{t("title")}</div>;
      },
      meta: { title: "Test" },
      resources: [],
    });

    renderWithConfig({
      modules: [module],
      locale: "fr",
      initialEntries: ["/test"],
    });

    const element = await screen.findByTestId("label");
    expect(element.textContent).toBe("Titre Français");
  });

  it("falls back to default locale when navigator is unavailable", async () => {
    vi.stubGlobal("navigator", undefined);

    const module = defineModule({
      path: "test",
      component: () => {
        const t = localeLabels.useT();
        return <div data-testid="label">{t("title")}</div>;
      },
      meta: { title: "Test" },
      resources: [],
    });

    renderWithConfig({
      modules: [module],
      initialEntries: ["/test"],
    });

    const element = await screen.findByTestId("label");
    expect(element.textContent).toBe("English Title");
  });

  it("extracts language code from full locale tag (e.g., 'fr-FR' -> 'fr')", async () => {
    vi.stubGlobal("navigator", {
      languages: ["fr-FR"],
      language: "fr-FR",
    });

    const module = defineModule({
      path: "test",
      component: () => {
        const t = localeLabels.useT();
        return <div data-testid="label">{t("title")}</div>;
      },
      meta: { title: "Test" },
      resources: [],
    });

    renderWithConfig({
      modules: [module],
      initialEntries: ["/test"],
    });

    const element = await screen.findByTestId("label");
    expect(element.textContent).toBe("Titre Français");
  });
});
