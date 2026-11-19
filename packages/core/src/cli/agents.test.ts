// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { CliContext } from "./agents";
import { BLOCK_FILE } from "./names";
import { run } from "./run";

interface Repo {
  root: string;
  read: (rel: string) => string;
  write: (rel: string, content: string) => void;
  /** Add a package that depends on AppShell and return a CLI bound to it. */
  frontend: (rel: string, scripts?: Record<string, string>) => Cli;
  setBlockSource: (source: string) => void;
}

interface Cli {
  (argv: string, env?: Record<string, string>): { code: number; out: string[]; warnings: string[] };
}

function repo(): Repo {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "app-shell-agents-")));
  const blockFile = join(root, "block-source.md");
  const write = (rel: string, content: string): void => {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  write("pnpm-workspace.yaml", "");
  write("block-source.md", "## AppShell\n\nDocs: `{{PACKAGE_ROOT}}/docs/`\n\nIndex v1\n");
  return {
    root,
    write,
    read: (rel) => readFileSync(join(root, rel), "utf8"),
    setBlockSource: (source) => write("block-source.md", source),
    frontend: (rel, scripts) => {
      write(
        join(rel, "package.json"),
        `${JSON.stringify({ name: rel, scripts, dependencies: { "@tailor-platform/app-shell": "^1.0.0" } }, null, 2)}\n`,
      );
      return (argv, env = {}) => {
        const out: string[] = [];
        const warnings: string[] = [];
        const ctx: CliContext = {
          cwd: join(root, rel),
          env,
          blockFile,
          log: (m) => out.push(m),
          warn: (m) => warnings.push(m),
        };
        return { code: run(argv.split(" ").filter(Boolean), ctx), out, warnings };
      };
    },
  };
}

const prepareOf = (r: Repo, rel: string): string | undefined =>
  (JSON.parse(r.read(join(rel, "package.json"))) as { scripts?: Record<string, string> }).scripts
    ?.prepare;

describe("agents init", () => {
  it("creates the root AGENTS.md and wires prepare", () => {
    const r = repo();
    const cli = r.frontend("apps/ims/frontend");
    expect(cli("agents init").code).toBe(0);

    const agents = r.read("AGENTS.md");
    expect(agents).toContain("<!-- app-shell:agents:start apps/ims/frontend -->");
    expect(agents).toContain(
      "Docs: `apps/ims/frontend/node_modules/@tailor-platform/app-shell/docs/`",
    );
    expect(prepareOf(r, "apps/ims/frontend")).toBe("app-shell agents sync");
  });

  it("appends to an existing file and chains an existing prepare", () => {
    const r = repo();
    r.write("AGENTS.md", "# Project\n\nHouse rules.\n");
    const cli = r.frontend("apps/web", { prepare: "lefthook install" });
    cli("agents init");

    expect(r.read("AGENTS.md").startsWith("# Project\n\nHouse rules.\n\n<!-- app-shell:")).toBe(
      true,
    );
    expect(prepareOf(r, "apps/web")).toBe("lefthook install && app-shell agents sync");
  });

  it("changes nothing on a second run", () => {
    const r = repo();
    const cli = r.frontend("apps/web");
    cli("agents init");
    const agents = r.read("AGENTS.md");
    const pkg = r.read("apps/web/package.json");
    expect(cli("agents init").code).toBe(0);
    expect(r.read("AGENTS.md")).toBe(agents);
    expect(r.read("apps/web/package.json")).toBe(pkg);
  });

  it("gives each frontend its own block", () => {
    const r = repo();
    r.frontend("apps/web")("agents init");
    r.frontend("apps/admin")("agents init");
    const agents = r.read("AGENTS.md");
    expect(agents).toContain("app-shell:agents:start apps/web -->");
    expect(agents).toContain("app-shell:agents:start apps/admin -->");
  });

  it("writes to --target and passes it on to prepare", () => {
    const r = repo();
    const cli = r.frontend("apps/web");
    expect(cli("agents init --target .").code).toBe(0);
    expect(existsSync(join(r.root, "AGENTS.md"))).toBe(false);
    expect(r.read("apps/web/AGENTS.md")).toContain(
      "Docs: `node_modules/@tailor-platform/app-shell/docs/`",
    );
    expect(prepareOf(r, "apps/web")).toBe("app-shell agents sync --target .");

    r.setBlockSource("Docs: `{{PACKAGE_ROOT}}/docs/`\n\nIndex v2\n");
    cli("agents sync --target .");
    expect(r.read("apps/web/AGENTS.md")).toContain("Index v2");
  });

  it("warns about a CLAUDE.md that does not import AGENTS.md", () => {
    const r = repo();
    r.write("CLAUDE.md", "# Claude\n");
    const cli = r.frontend("apps/web");
    expect(cli("agents init").warnings.join("\n")).toMatch(/CLAUDE\.md does not import AGENTS\.md/);

    r.write("CLAUDE.md", "@AGENTS.md\n");
    expect(cli("agents init").warnings).toEqual([]);
  });

  it("refuses to run outside a package that depends on AppShell", () => {
    const r = repo();
    r.write("package.json", '{ "name": "root" }\n');
    r.frontend("apps/web");
    const ctx: CliContext = {
      cwd: r.root,
      env: {},
      blockFile: join(r.root, "block-source.md"),
      log: () => {},
      warn: () => {},
    };
    expect(run(["agents", "init"], ctx)).toBe(1);
    expect(existsSync(join(r.root, "AGENTS.md"))).toBe(false);
    expect(r.read("package.json")).toBe('{ "name": "root" }\n');
  });
});

describe("agents sync", () => {
  const initialised = (): { r: Repo; cli: Cli } => {
    const r = repo();
    r.write("AGENTS.md", "# Project\n\nHouse rules.\n");
    const cli = r.frontend("apps/web");
    cli("agents init");
    r.write("AGENTS.md", `${r.read("AGENTS.md")}\n## After\n\nKeep me.\n`);
    return { r, cli };
  };

  it("round-trips: refreshes the block and leaves the rest alone", () => {
    const { r, cli } = initialised();
    const before = r.read("AGENTS.md");
    r.setBlockSource("## AppShell\n\nDocs: `{{PACKAGE_ROOT}}/docs/`\n\nIndex v2\n");

    const result = cli("agents sync");
    expect(result.code).toBe(0);
    expect(result.out.join("\n")).toMatch(/updated the AppShell block in \.\.\/\.\.\/AGENTS\.md/);
    expect(r.read("AGENTS.md")).toBe(before.replace("Index v1", "Index v2"));
  });

  it("does not write when nothing changed", () => {
    const { r, cli } = initialised();
    const mtime = statSync(join(r.root, "AGENTS.md")).mtimeMs;
    const result = cli("agents sync");
    expect(result).toEqual({ code: 0, out: [], warnings: [] });
    expect(statSync(join(r.root, "AGENTS.md")).mtimeMs).toBe(mtime);
  });

  it("rewrites only its own package's block", () => {
    const { r, cli } = initialised();
    r.frontend("apps/admin")("agents init");
    r.setBlockSource("Docs: `{{PACKAGE_ROOT}}/docs/`\n\nIndex v2\n");
    cli("agents sync");

    const [web, admin] = r.read("AGENTS.md").split("app-shell:agents:start apps/admin");
    expect(web).toContain("Index v2");
    expect(admin).toContain("Index v1");
  });

  it("does nothing when the block was deleted", () => {
    const r = repo();
    r.write("AGENTS.md", "# Project\n");
    const cli = r.frontend("apps/web", { prepare: "app-shell agents sync" });
    expect(cli("agents sync")).toEqual({ code: 0, out: [], warnings: [] });
    expect(r.read("AGENTS.md")).toBe("# Project\n");
  });

  it("never creates the file", () => {
    const r = repo();
    expect(r.frontend("apps/web")("agents sync").code).toBe(0);
    expect(existsSync(join(r.root, "AGENTS.md"))).toBe(false);
  });

  it("skips in CI", () => {
    const { r, cli } = initialised();
    const before = r.read("AGENTS.md");
    r.setBlockSource("Docs: `{{PACKAGE_ROOT}}/docs/`\n\nIndex v2\n");
    expect(cli("agents sync", { CI: "true" }).code).toBe(0);
    expect(r.read("AGENTS.md")).toBe(before);
  });

  it("exits 0 even when it cannot run", () => {
    const { r, cli } = initialised();
    expect(cli("agents sync --bogus").code).toBe(0);
    // The target is a directory with no AGENTS.md in it, and then a file read fails.
    mkdirSync(join(r.root, "apps/web/AGENTS.md"));
    const result = cli("agents sync --target AGENTS.md/AGENTS.md/x");
    expect(result.code).toBe(0);
  });
});

describe("cli", () => {
  it("prints usage for an unknown command", () => {
    const r = repo();
    const cli = r.frontend("apps/web");
    expect(cli("nope").code).toBe(2);
    expect(cli("--help").code).toBe(0);
  });

  it("reads the block from where docs-kit emits it", () => {
    const config = JSON.parse(
      readFileSync(join(import.meta.dirname, "../../../../docs-kit.config.json"), "utf8"),
    ) as { outputs: { agents: { packageDir: string; blockFile: string } } };
    expect(config.outputs.agents.packageDir).toBe("packages/core");
    expect(config.outputs.agents.blockFile).toBe(BLOCK_FILE);
  });
});
