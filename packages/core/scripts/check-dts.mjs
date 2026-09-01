#!/usr/bin/env node
/**
 * Regression gate for the type declarations we publish to npm.
 *
 * `packages/core/tsconfig.json` sets `skipLibCheck: true`, so `pnpm type-check`
 * never type-checks our own emitted `.d.ts`. Broken declarations therefore ship
 * silently and only blow up for consumers who compile with
 * `skipLibCheck: false` — the errors originate inside our package, not theirs.
 *
 * Flipping `skipLibCheck` in `packages/core/tsconfig.json` does *not* close that
 * gap: it checks the `.d.ts` files in `node_modules`, not the ones we emit. So
 * this gate reproduces what a consumer actually does:
 *
 *   build -> pnpm pack -> install the tarball into a throwaway project
 *   -> `tsc --noEmit` with `skipLibCheck: false`
 *
 * Every published entry point that declares `types` is imported and checked, so
 * a new entry point is covered the moment it is added to `exports`.
 *
 * Usage:
 *   node scripts/check-dts.mjs          # via `pnpm --filter ... check-dts`
 *   KEEP_DTS_FIXTURE=1 node scripts/...  # keep the scratch project for debugging
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const corePkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(corePkgDir, "..", "..");
const vitePluginDir = join(repoRoot, "packages", "vite-plugin");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const corePkg = readJson(join(corePkgDir, "package.json"));

/**
 * The consumer-facing toolchain. Pinned to the versions this repo already
 * resolves so the gate fails on our declarations changing, never on a
 * background npm release.
 */
const pinned = (name) => {
  const path = join(corePkgDir, "node_modules", name, "package.json");
  if (!existsSync(path)) {
    throw new Error(`Cannot pin ${name}: ${path} not found. Run \`pnpm install\` first.`);
  }
  return readJson(path).version;
};

/**
 * Entry points to verify: every `exports` subpath that publishes types.
 * Derived from `package.json` rather than hard-coded, so `./testing` and any
 * future entry point are covered automatically. CSS-only subpaths
 * (`./styles`, `./themes/*`) declare no `types` and are skipped.
 */
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

// Fail early and clearly when the package has not been built.
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

  // Pack the local vite-plugin too. Core depends on it via `workspace:*`, which
  // pack rewrites to a concrete version; installing our own tarball keeps the
  // gate hermetic instead of resolving that version from the registry.
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
          // The `./vite-plugin` entry pulls in Vite's own declarations, which
          // reference `node:*` builtins. Any real consumer of a Vite plugin has
          // these installed; without them the gate drowns in unrelated errors.
          "@types/node": pinned("@types/node"),
        },
        // Make sure the workspace build of the vite plugin is what core resolves.
        overrides: { [vitePluginName]: `file:${vitePluginTarball}` },
      },
      null,
      2,
    )}\n`,
  );

  /**
   * `target`/`lib` are set explicitly: without them, `@types/react` and
   * `react-router` report `Cannot find name 'Iterable'`, which is an artefact of
   * this config rather than a defect in our declarations.
   */
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

  console.log("check-dts: installing the packed tarball into a scratch project…");
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], project);

  console.log("check-dts: type-checking with skipLibCheck: false…");
  let output = "";
  let tscFailed = false;
  try {
    output = run(
      process.execPath,
      [
        join(project, "node_modules", "typescript", "bin", "tsc"),
        "--noEmit",
        "-p",
        "tsconfig.json",
      ],
      project,
    );
  } catch (error) {
    tscFailed = true;
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  /**
   * Three buckets:
   * - `ours` — inside our published package, or in the importing file (which
   *   means an entry point is unusable). Fatal; this is what the gate exists for.
   * - `foreign` — inside another package's declarations. Reported but not fatal:
   *   we do not control them, and failing on them is exactly the trap that rules
   *   out turning `skipLibCheck: false` on repo-wide.
   * - `unexpected` — anything not attributed to a file, e.g. a tsconfig error.
   *   Fatal, so a broken harness can never masquerade as a clean run.
   *
   * tsc always writes diagnostic paths with forward slashes, on every platform.
   */
  const ourPrefix = `node_modules/${corePkg.name}`;
  const ours = [];
  const foreign = [];
  const unexpected = [];
  for (const line of output.split("\n")) {
    if (!/error TS\d+:/.test(line)) continue;
    if (line.includes(ourPrefix) || line.startsWith("check.tsx")) ours.push(line);
    else if (line.includes("node_modules/")) foreign.push(line);
    else unexpected.push(line);
  }

  if (foreign.length > 0) {
    console.log(`\ncheck-dts: ${foreign.length} error(s) in third-party declarations (not fatal):`);
    for (const line of foreign.slice(0, 20)) console.log(`  ${line}`);
  }

  if (ours.length > 0) {
    failed = true;
    console.error(
      `\ncheck-dts: FAILED — ${ours.length} error(s) in the published declarations of ${corePkg.name}:\n`,
    );
    for (const line of ours) console.error(`  ${line}`);
    console.error(
      "\nThese errors are invisible to `pnpm type-check` (it sets skipLibCheck: true) but break\n" +
        "every consumer compiling with `skipLibCheck: false`. Fix them at the source in\n" +
        "packages/core/src, then re-run `pnpm --filter @tailor-platform/app-shell check-dts`.",
    );
  } else if (unexpected.length > 0 || (tscFailed && foreign.length === 0)) {
    failed = true;
    console.error("\ncheck-dts: FAILED — the check itself did not run cleanly:\n");
    console.error(output.trim() || "(no output)");
  } else {
    console.log(
      `\ncheck-dts: OK — published declarations type-check cleanly for ${entryPoints.map((e) => e.subpath).join(", ")}.`,
    );
  }
} finally {
  if (process.env.KEEP_DTS_FIXTURE) {
    console.log(`check-dts: scratch project kept at ${project}`);
  } else {
    rmSync(scratch, { recursive: true, force: true });
  }
}

process.exit(failed ? 1 : 0);
