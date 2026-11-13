#!/usr/bin/env node
/**
 * Regression gate for the type declarations we publish to npm.
 *
 * `packages/core/tsconfig.json` sets `skipLibCheck: true`, so `pnpm type-check`
 * never reads our own emitted `.d.ts` — broken declarations ship silently and
 * only surface for consumers compiling with `skipLibCheck: false`. Flipping that
 * flag here would not help: it checks `node_modules`, not what we emit. Hence the
 * round-trip through a real tarball install.
 *
 * Set KEEP_DTS_FIXTURE=1 to keep the scratch project for debugging.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const corePkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(corePkgDir, "..", "..");
const vitePluginDir = join(repoRoot, "packages", "vite-plugin");
const fixturesDir = join(corePkgDir, "tests", "dts");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const corePkg = readJson(join(corePkgDir, "package.json"));

/** Pin to what the repo already resolves, so a background npm release can't fail the gate. */
const pinned = (name) => {
  const path = join(corePkgDir, "node_modules", name, "package.json");
  if (!existsSync(path)) {
    throw new Error(`Cannot pin ${name}: ${path} not found. Run \`pnpm install\` first.`);
  }
  return readJson(path).version;
};

/** Derived rather than hard-coded, so a newly added entry point is covered automatically. */
const collectEntryPoints = () => {
  const entries = [];
  for (const [subpath, value] of Object.entries(corePkg.exports ?? {})) {
    if (typeof value !== "object" || value === null || typeof value.types !== "string") continue;
    if (subpath.includes("*")) continue;
    entries.push({ subpath, types: value.types });
  }
  return entries.toSorted((a, b) => a.subpath.localeCompare(b.subpath));
};

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const pack = (pkgDir, destination) => {
  const before = new Set(readdirSync(destination));
  run("pnpm", ["pack", "--pack-destination", destination], pkgDir);
  const created = readdirSync(destination).filter((f) => f.endsWith(".tgz") && !before.has(f));
  if (created.length !== 1) {
    throw new Error(
      `Expected exactly one new tarball from packing ${pkgDir}, got: ${created.join(", ") || "none"}`,
    );
  }
  return join(destination, created[0]);
};

const entryPoints = collectEntryPoints();
if (entryPoints.length === 0) {
  console.error("check-dts: no entry points with `types` found in package.json `exports`.");
  process.exit(1);
}

const missing = entryPoints.filter(({ types }) => !existsSync(join(corePkgDir, types)));
if (missing.length > 0) {
  console.error(`check-dts: missing declaration output: ${missing.map((e) => e.types).join(", ")}`);
  console.error("Run `pnpm --filter @tailor-platform/app-shell build` first.");
  process.exit(1);
}
if (!existsSync(join(vitePluginDir, "dist"))) {
  console.error("check-dts: packages/vite-plugin is not built. Run `pnpm build` first.");
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), "app-shell-dts-"));
const tarballDir = join(scratch, "tarballs");
const project = join(scratch, "project");
mkdirSync(tarballDir);
mkdirSync(project);

let failed = false;
try {
  console.log(
    `check-dts: verifying ${entryPoints.length} entry point(s): ${entryPoints.map((e) => e.subpath).join(", ")}`,
  );

  // Core depends on vite-plugin via `workspace:*`, which pack rewrites to a concrete
  // version; packing it locally too keeps the gate off the registry.
  const corePkgTarball = pack(corePkgDir, tarballDir);
  const vitePluginTarball = pack(vitePluginDir, tarballDir);
  const vitePluginName = readJson(join(vitePluginDir, "package.json")).name;

  writeFileSync(
    join(project, "package.json"),
    `${JSON.stringify(
      {
        name: "app-shell-dts-check",
        private: true,
        version: "0.0.0",
        type: "module",
        dependencies: {
          [corePkg.name]: `file:${corePkgTarball}`,
          [vitePluginName]: `file:${vitePluginTarball}`,
          react: pinned("react"),
          "react-dom": pinned("react-dom"),
        },
        devDependencies: {
          typescript: pinned("typescript"),
          "@types/react": pinned("@types/react"),
          "@types/react-dom": pinned("@types/react-dom"),
          // Vite's declarations reference `node:*`; without these the gate drowns in noise.
          "@types/node": pinned("@types/node"),
        },
        overrides: { [vitePluginName]: `file:${vitePluginTarball}` },
      },
      null,
      2,
    )}\n`,
  );

  // `target`/`lib` are explicit: without them `@types/react` and `react-router` report
  // `Cannot find name 'Iterable'`, an artefact of this config rather than a real defect.
  writeFileSync(
    join(project, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "es2022",
          lib: ["es2023", "dom", "dom.iterable"],
          module: "esnext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          declaration: true,
          jsx: "react-jsx",
          skipLibCheck: false,
        },
        include: ["check.tsx"],
      },
      null,
      2,
    )}\n`,
  );

  const checkSource = entryPoints
    .map(({ subpath }, i) => {
      const specifier =
        subpath === "." ? corePkg.name : `${corePkg.name}/${subpath.replace(/^\.\//, "")}`;
      return `import * as entry${i} from "${specifier}";\nvoid entry${i};`;
    })
    .join("\n");
  writeFileSync(join(project, "check.tsx"), `${checkSource}\n`);

  const checks = [{ name: "entry-points", directory: project }];
  for (const entry of readdirSync(fixturesDir, { withFileTypes: true }).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory()) continue;
    const directory = join(project, "fixtures", entry.name);
    cpSync(join(fixturesDir, entry.name), directory, { recursive: true });
    writeFileSync(
      join(directory, "tsconfig.json"),
      `${JSON.stringify(
        { extends: "../../tsconfig.json", include: ["**/*.ts", "**/*.tsx"] },
        null,
        2,
      )}\n`,
    );
    checks.push({ name: entry.name, directory });
  }

  console.log("check-dts: installing the packed tarball into a scratch project…");
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], project);
  const ts = createRequire(join(project, "package.json"))("typescript");

  // Each case gets its own program and host so module augmentations cannot leak between fixtures.
  for (const { name, directory } of checks) {
    console.log(`check-dts: checking ${name} with skipLibCheck: false…`);
    const configPath = join(directory, "tsconfig.json");
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const config = configFile.error
      ? undefined
      : ts.parseJsonConfigFileContent(configFile.config, ts.sys, directory, {}, configPath);
    const configErrors = configFile.error ? [configFile.error] : (config?.errors ?? []);
    const diagnostics = [];
    const host = ts.createCompilerHost(config?.options ?? {});
    host.getCurrentDirectory = () => directory;
    if (config) {
      const program = ts.createProgram({
        rootNames: config.fileNames,
        options: config.options,
        host,
      });
      diagnostics.push(...ts.getPreEmitDiagnostics(program));
    }

    // Config errors always fail, even if an extended config lives in node_modules.
    // Third-party declaration errors are reported but not fatal.
    const ourPrefix = `node_modules/${corePkg.name}/`;
    const ours = configErrors.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    const foreign = [];
    for (const diagnostic of diagnostics) {
      if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
      const filePath = diagnostic.file?.fileName.replaceAll("\\", "/");
      if (!filePath || filePath.includes(ourPrefix) || !filePath.includes("node_modules/")) {
        ours.push(diagnostic);
      } else {
        foreign.push(diagnostic);
      }
    }

    if (foreign.length > 0) {
      console.log(`\ncheck-dts: ${name}: ${foreign.length} third-party error(s) (not fatal):`);
      console.log(ts.formatDiagnosticsWithColorAndContext(foreign.slice(0, 20), host));
    }

    if (ours.length > 0) {
      failed = true;
      console.error(
        `\ncheck-dts: FAILED — ${name}: ${ours.length} declaration/consumer error(s):\n`,
      );
      console.error(ts.formatDiagnosticsWithColorAndContext(ours, host));
    } else {
      console.log(`check-dts: OK — ${name}`);
    }
  }

  if (!failed) {
    console.log(`\ncheck-dts: OK — all ${checks.length} declaration checks passed.`);
  }
} finally {
  if (process.env.KEEP_DTS_FIXTURE) {
    console.log(`check-dts: scratch project kept at ${project}`);
  } else {
    rmSync(scratch, { recursive: true, force: true });
  }
}

process.exit(failed ? 1 : 0);
