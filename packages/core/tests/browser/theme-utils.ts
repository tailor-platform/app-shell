/// <reference types="vite/client" />
import creamUrl from "@tailor-platform/app-shell/themes/cream?url";
import bloomUrl from "@tailor-platform/app-shell/themes/bloom?url";
import { expect } from "vitest";

export async function applyPalette(palette: "default" | "cream" | "bloom", mode: "light" | "dark") {
  document.querySelectorAll("link[data-test-palette]").forEach((link) => link.remove());
  document.documentElement.classList.toggle("dark", mode === "dark");
  if (palette === "default") return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = palette === "cream" ? creamUrl : bloomUrl;
  link.dataset.testPalette = palette;
  await new Promise<void>((resolve, reject) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load ${palette} palette`)), {
      once: true,
    });
    document.head.append(link);
  });
}

export function colour(value: string): string {
  const probe = document.createElement("span");
  probe.style.setProperty("--test-colour", value);
  probe.style.color = "var(--test-colour)";
  document.body.append(probe);
  try {
    const style = getComputedStyle(probe);
    expect(CSS.supports("color", style.getPropertyValue("--test-colour")), value).toBe(true);
    return style.color;
  } finally {
    probe.remove();
  }
}

// Canvas delegates CSS colour parsing and alpha compositing to the browser.
// shortcut: 8-bit flat backgrounds only; use rendered checks for gradients or group opacity.
export function sample(...colours: string[]): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  for (const value of colours) {
    expect(CSS.supports("color", value), value).toBe(true);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
  }
  return ctx.getImageData(0, 0, 1, 1).data;
}

function luminance(pixel: Uint8ClampedArray): number {
  const channels = Array.from(pixel.subarray(0, 3), (channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastOn(foreground: string, surface: string, page: string): number {
  const a = luminance(sample(page, surface, foreground));
  const b = luminance(sample(page, surface));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
