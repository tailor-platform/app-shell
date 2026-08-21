import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../../package.json";
import { BuiltInCommandPalette } from "@/components/command-palette";
import {
  AppShellConfigContext,
  AppShellDataContext,
  type RootConfiguration,
} from "@/contexts/appshell-context";
import { BreadcrumbOverrideProvider } from "@/contexts/breadcrumb-context";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
import { RouterContainer } from "@/routing/router";
import { Outlet } from "react-router";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

const configurations: RootConfiguration = {
  modules: [],
  settingsResources: [],
  locale: "ja",
  errorBoundary: undefined,
};

const renderAppShell = (initialEntries: string[]) =>
  render(
    <AppShellConfigContext.Provider
      value={{
        title: "受発注システム",
        appInfo: {
          metadata: [
            { label: "環境", value: "staging" },
            { label: "リリース", value: "2026.07.16" },
          ],
        },
        configurations,
      }}
    >
      <AppShellDataContext.Provider value={{ contextData: {} }}>
        <BreadcrumbOverrideProvider>
          <CommandPaletteProvider>
            <RouterContainer memory initialEntries={initialEntries}>
              <Outlet />
              <BuiltInCommandPalette />
            </RouterContainer>
          </CommandPaletteProvider>
        </BreadcrumbOverrideProvider>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>,
  );

describe("App info", () => {
  it("opens /__appinfo from the command palette and renders built-in + app-defined rows", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderAppShell(["/"]);

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    await screen.findByPlaceholderText("ページを検索...");
    fireEvent.click(screen.getByText("/__appinfo").closest("button")!);

    await screen.findAllByText("アプリ情報");
    expect(screen.getByText("受発注システム")).toBeDefined();
    expect(screen.getByText("staging")).toBeDefined();
    expect(screen.getByText("2026.07.16")).toBeDefined();
    expect(screen.getByText(packageJson.version)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "コピー" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        [
          "アプリ名: 受発注システム",
          `AppShell バージョン: ${packageJson.version}`,
          "環境: staging",
          "リリース: 2026.07.16",
        ].join("\n"),
      );
    });

    await waitFor(() => {
      expect(document.title).toBe("アプリ情報 · 受発注システム");
    });
  });
});
