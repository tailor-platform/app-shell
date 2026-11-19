import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import { appendBlock, renderBlock, replaceBlock } from "./block";
import { AGENTS_FILE, GUIDE_URL, PACKAGE_NAME, commandLine } from "./names";
import { chainPrepare, setPrepareScript } from "./prepare-script";
import {
  blockPaths,
  findAgentsFilesUpward,
  findRepoRoot,
  resolveTargetFile,
  toPosix,
} from "./repo";

export interface CliContext {
  /** The package that depends on AppShell: where `init` is run and where `prepare` runs. */
  cwd: string;
  env: Record<string, string | undefined>;
  /** Absolute path of the block docs-kit emitted into this package. */
  blockFile: string;
  log: (message: string) => void;
  warn: (message: string) => void;
}

export interface AgentsOptions {
  target?: string;
  /** `init` only: also chain `sync` into the package's `prepare` script. */
  addPrepare?: boolean;
}

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const quoteArg = (arg: string): string => (/\s/.test(arg) ? JSON.stringify(arg) : arg);

/** One read instead of exists-then-read, so the file can't change between the two. */
function readIfExists(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function buildBlock(
  ctx: CliContext,
  source: string,
  targetFile: string,
): { key: string; block: string } {
  const { key, packageRoot } = blockPaths(ctx.cwd, targetFile);
  return { key, block: renderBlock(source, key, packageRoot) };
}

/** Opt in: write the block, wire the refresh into `prepare` when asked, and
 * flag files that would hide or compete with it. Returns the exit code. */
export function init(ctx: CliContext, options: AgentsOptions = {}): number {
  const display = (abs: string): string => toPosix(relative(ctx.cwd, abs)) || ".";
  const packageJsonPath = join(ctx.cwd, "package.json");
  const packageJson = readIfExists(packageJsonPath);
  const pkg = packageJson === null ? null : (JSON.parse(packageJson) as PackageJson);
  const dependsOnAppShell =
    pkg !== null &&
    [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].some(
      (deps) => deps && PACKAGE_NAME in deps,
    );
  if (packageJson === null || pkg === null || !dependsOnAppShell) {
    ctx.warn(
      `${commandLine("init")}: run this from the package that depends on ${PACKAGE_NAME} (its package.json lists it).`,
    );
    return 1;
  }
  const source = readIfExists(ctx.blockFile);
  if (source === null) {
    ctx.warn(`${commandLine("init")}: this build of ${PACKAGE_NAME} ships no agents block.`);
    return 1;
  }

  const targetFile = resolveTargetFile(ctx.cwd, options.target);
  const { key, block } = buildBlock(ctx, source, targetFile);
  const existing = readIfExists(targetFile);
  const next =
    existing === null
      ? `${block}\n`
      : (replaceBlock(existing, key, block) ?? appendBlock(existing, block));
  if (next === existing) {
    ctx.log(`${display(targetFile)}: AppShell block already up to date.`);
  } else {
    mkdirSync(dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, next, "utf8");
    ctx.log(
      `${display(targetFile)}: ${existing === null ? "created with" : "wrote"} the AppShell block.`,
    );
  }

  const command = [
    commandLine("sync"),
    ...(options.target ? ["--target", quoteArg(options.target)] : []),
  ].join(" ");
  const { script, status } = chainPrepare(pkg.scripts?.prepare, command);
  if (status === "added" && !options.addPrepare) {
    ctx.log(
      `package.json: not changed. To refresh the block on install, rerun with --add-prepare; otherwise run \`${command}\` after upgrading ${PACKAGE_NAME}. See ${GUIDE_URL}`,
    );
  } else if (status === "added") {
    writeFileSync(packageJsonPath, setPrepareScript(packageJson, script), "utf8");
    ctx.log(`package.json: "prepare" now runs \`${command}\`, so the block refreshes on install.`);
  } else if (status === "differs") {
    ctx.warn(
      `package.json: "prepare" already runs \`${commandLine("sync")}\` with other arguments. Left as is; expected \`${command}\`.`,
    );
  }

  const claudeFile = join(dirname(targetFile), "CLAUDE.md");
  const claude = basename(targetFile) === AGENTS_FILE ? readIfExists(claudeFile) : null;
  if (claude !== null && !claude.includes(`@${AGENTS_FILE}`)) {
    ctx.warn(
      `${display(claudeFile)} does not import ${AGENTS_FILE}, so Claude Code will not read the block. Add a line with \`@${AGENTS_FILE}\` to it.`,
    );
  }
  // Tools differ on which of several AGENTS.md files they load (nearest, all, or
  // root only), so an agent working in this package may not see the block.
  const agentsFiles = new Set([
    ...findAgentsFilesUpward(ctx.cwd, findRepoRoot(ctx.cwd)),
    targetFile,
  ]);
  if (agentsFiles.size > 1) {
    ctx.warn(
      `Found ${agentsFiles.size} AGENTS.md files between this package and the repo root (${[...agentsFiles].map(display).join(", ")}). The block is in ${display(targetFile)}. Some agents only read the nearest one; use --target to move the block if needed.`,
    );
  }
  return 0;
}

/** Refresh an existing block. Touches nothing when the consumer has no block,
 * so a leftover `prepare` line is harmless after opting out. */
export function sync(ctx: CliContext, options: AgentsOptions = {}): void {
  // CI installs from a clean checkout and must not leave it dirty.
  const ci = ctx.env.CI;
  if (ci && ci !== "false" && ci !== "0") return;
  const source = readIfExists(ctx.blockFile);
  if (source === null) return;

  const targetFile = resolveTargetFile(ctx.cwd, options.target);
  const existing = readIfExists(targetFile);
  if (existing === null) return;
  const { key, block } = buildBlock(ctx, source, targetFile);
  const next = replaceBlock(existing, key, block);
  if (next === null || next === existing) return;
  writeFileSync(targetFile, next, "utf8");
  ctx.log(
    `${commandLine("sync")}: updated the AppShell block in ${toPosix(relative(ctx.cwd, targetFile))}. Commit the change.`,
  );
}
