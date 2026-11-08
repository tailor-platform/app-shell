import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageDir = resolve(import.meta.dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function lint(file: string, config = "test/fixture/oxlint.config.ts") {
  return spawnSync(pnpm, ["exec", "oxlint", "-c", config, file], {
    cwd: packageDir,
    encoding: "utf8",
  });
}

describe("recommended", () => {
  it("loads from an oxlint.config.ts consumer config", () => {
    expect(lint("test/fixture/valid.ts").status).toBe(0);
  });

  it.each([
    ["test/fixture/astw-prefix-invalid.tsx", "no-astw-prefix"],
    ["test/fixture/invalid.ts", "no-react-router-imports"],
  ])("enables %s", (file, rule) => {
    const result = lint(file);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`@tailor-platform/app-shell(${rule})`);
  });

  it("reports deprecated tokens as a warning", () => {
    const result = lint("test/fixture/deprecated-tokens-warning.tsx");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("@tailor-platform/app-shell(no-deprecated-tokens)");
  });

  it("does not enable prefer-text-components", () => {
    const result = lint("test/fixture/text-size-on-tag.tsx");

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("prefer-text-components");
  });

  it("reports prefer-text-components when a config enables it", () => {
    const result = lint(
      "test/fixture/text-size-on-tag.tsx",
      "test/fixture/oxlint.prefer-text-components.config.ts",
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("@tailor-platform/app-shell(prefer-text-components)");
  });
});
