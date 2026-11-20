// @vitest-environment node
import { describe, expect, it } from "vitest";

import { chainPrepare, setPrepareScript } from "./prepare-script";

const SYNC = "app-shell agents sync";

describe("chainPrepare", () => {
  it("creates the script when there is none", () => {
    expect(chainPrepare(undefined, SYNC)).toEqual({ script: SYNC, status: "added" });
    expect(chainPrepare("  ", SYNC)).toEqual({ script: SYNC, status: "added" });
  });

  it("chains after an existing script", () => {
    expect(chainPrepare("lefthook install", SYNC)).toEqual({
      script: `lefthook install && ${SYNC}`,
      status: "added",
    });
  });

  it("does not duplicate a command that is already there", () => {
    for (const existing of [SYNC, `lefthook install && ${SYNC}`, `${SYNC} && husky`]) {
      expect(chainPrepare(existing, SYNC)).toEqual({ script: existing, status: "present" });
    }
  });

  it("leaves a sync command with other arguments alone", () => {
    const existing = `${SYNC} --target ../../CLAUDE.md`;
    expect(chainPrepare(existing, SYNC)).toEqual({ script: existing, status: "differs" });
    expect(chainPrepare(SYNC, existing)).toEqual({ script: SYNC, status: "differs" });
  });
});

describe("setPrepareScript", () => {
  it("adds the script and keeps the file's indentation and trailing newline", () => {
    const text = '{\n\t"name": "web",\n\t"scripts": {\n\t\t"dev": "vite"\n\t}\n}\n';
    expect(setPrepareScript(text, SYNC)).toBe(
      `{\n\t"name": "web",\n\t"scripts": {\n\t\t"dev": "vite",\n\t\t"prepare": "${SYNC}"\n\t}\n}\n`,
    );
  });

  it("creates the scripts object when missing", () => {
    expect(setPrepareScript('{\n  "name": "web"\n}', SYNC)).toBe(
      `{\n  "name": "web",\n  "scripts": {\n    "prepare": "${SYNC}"\n  }\n}`,
    );
  });
});
