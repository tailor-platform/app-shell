import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("public entrypoints", () => {
  it("keeps CSS out of the JS entry and routes styles through vendored font assets", () => {
    const index = read("./index.ts");
    const styles = read("./styles.ts");
    const globals = read("./globals.css");
    const inter = read("./assets/fonts/inter.css");

    expect(index).not.toMatch(/\.css["']/);
    expect(styles).toContain('import "./globals.css";');
    expect(globals).toContain('@import "./assets/fonts/inter.css";');
    expect(globals).not.toContain("@fontsource-variable/inter");
    expect(inter).toContain("./fonts/files/inter-latin-wght-normal.woff2");
  });
});
