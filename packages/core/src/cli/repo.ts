import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import { AGENTS_FILE, PACKAGE_NAME } from "./names";

export const toPosix = (p: string): string => p.split(sep).join("/");

/** Walk up from the package to the repo root. `.git` wins over a nearer
 * `pnpm-workspace.yaml`, because agents load the file at the git root; the
 * workspace file covers checkouts with no `.git` (a tarball, a Docker context).
 * Starts from cwd, not `INIT_CWD`: in a pnpm workspace `prepare` runs with cwd
 * set to the package, while `INIT_CWD` is wherever the install was started. */
export function findRepoRoot(start: string): string {
  let workspaceRoot: string | undefined;
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (!workspaceRoot && existsSync(join(dir, "pnpm-workspace.yaml"))) workspaceRoot = dir;
    if (dirname(dir) === dir) break;
  }
  return workspaceRoot ?? resolve(start);
}

/** Every AGENTS.md from the package up to the repo root, nearest first. Name
 * matching ignores case, as a lowercase `agents.md` is loaded by some tools. */
export function findAgentsFilesUpward(packageDir: string, repoRoot: string): string[] {
  const found: string[] = [];
  const stop = resolve(repoRoot);
  for (let dir = resolve(packageDir); ; dir = dirname(dir)) {
    let names: string[] = [];
    try {
      names = readdirSync(dir);
    } catch {
      // Unreadable directory: nothing to report for it.
    }
    for (const name of names) {
      if (name.toLowerCase() === AGENTS_FILE.toLowerCase()) found.push(join(dir, name));
    }
    if (dir === stop || dirname(dir) === dir) return found;
  }
}

/** The file the block lives in: `--target`, or `AGENTS.md` at the repo root. */
export function resolveTargetFile(packageDir: string, target?: string): string {
  if (!target) return join(findRepoRoot(packageDir), AGENTS_FILE);
  const abs = resolve(packageDir, target);
  const isDir = /[\\/]$/.test(target) || (existsSync(abs) && statSync(abs).isDirectory());
  return isDir ? join(abs, AGENTS_FILE) : abs;
}

/** Where the package is installed for `packageDir`, by its `node_modules` link
 * rather than its real path: pnpm's store path carries the version, which would
 * change the block on every upgrade. pnpm links into the package's own
 * `node_modules`; npm and yarn workspaces may hoist to an ancestor. */
export function findInstalledPackage(packageDir: string): string {
  const own = join(resolve(packageDir), "node_modules", PACKAGE_NAME);
  for (let dir = resolve(packageDir); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", PACKAGE_NAME);
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) return own;
  }
}

/** Paths in the block are relative to the directory of the file it lives in. */
export function blockPaths(
  packageDir: string,
  targetFile: string,
): { key: string; packageRoot: string } {
  const base = dirname(targetFile);
  return {
    key: toPosix(relative(base, resolve(packageDir))) || ".",
    packageRoot: toPosix(relative(base, findInstalledPackage(packageDir))),
  };
}
