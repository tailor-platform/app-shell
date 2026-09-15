import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageDir = resolve(import.meta.dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function lint(file: string) {
  return spawnSync(pnpm, ["exec", "oxlint", "-c", "test/fixture/oxlint.config.ts", file], {
    cwd: packageDir,
    encoding: "utf8",
  });
}

describe("recommended", () => {
  it("loads from an oxlint.config.ts consumer config", () => {
    expect(lint("test/fixture/valid.ts").status).toBe(0);
  });

  it("enables no-react-router-imports", () => {
    const result = lint("test/fixture/invalid.ts");

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("@tailor-platform/app-shell(no-react-router-imports)");
  });
});
