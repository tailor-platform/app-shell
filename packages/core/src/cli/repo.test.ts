// @vitest-environment node
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { blockPaths, findRepoRoot, resolveTargetFile } from "./repo";

const tmp = (): string => realpathSync(mkdtempSync(join(tmpdir(), "app-shell-cli-")));
const dir = (...parts: string[]): string => {
  const p = join(...parts);
  mkdirSync(p, { recursive: true });
  return p;
};

describe("findRepoRoot", () => {
  it("walks up from a nested package to the workspace root", () => {
    const root = tmp();
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    expect(findRepoRoot(dir(root, "apps/ims/frontend"))).toBe(root);
  });

  it("finds a .git directory or a worktree's .git file", () => {
    const repo = tmp();
    dir(repo, ".git");
    expect(findRepoRoot(dir(repo, "app/erp/frontend"))).toBe(repo);

    const worktree = tmp();
    writeFileSync(join(worktree, ".git"), "gitdir: elsewhere\n");
    expect(findRepoRoot(dir(worktree, "app/erp/frontend"))).toBe(worktree);
  });

  it("prefers the git root over a nearer workspace file", () => {
    const repo = tmp();
    dir(repo, ".git");
    writeFileSync(join(dir(repo, "js"), "pnpm-workspace.yaml"), "");
    expect(findRepoRoot(dir(repo, "js/apps/web"))).toBe(repo);
  });

  it("treats a single-package repo as the package at the root", () => {
    const repo = tmp();
    dir(repo, ".git");
    expect(findRepoRoot(repo)).toBe(repo);
  });
});

describe("resolveTargetFile", () => {
  it("defaults to AGENTS.md at the repo root", () => {
    const root = tmp();
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    expect(resolveTargetFile(dir(root, "apps/web"))).toBe(join(root, "AGENTS.md"));
  });

  it("resolves --target from the package, and a directory to its AGENTS.md", () => {
    const root = tmp();
    const web = dir(root, "apps/web");
    expect(resolveTargetFile(web, "../../CLAUDE.md")).toBe(join(root, "CLAUDE.md"));
    expect(resolveTargetFile(web, ".")).toBe(join(web, "AGENTS.md"));
    expect(resolveTargetFile(web, "../../agents/")).toBe(join(root, "agents", "AGENTS.md"));
  });
});

describe("blockPaths", () => {
  it("keys the block by package path and points into that package's node_modules", () => {
    const root = tmp();
    const web = dir(root, "apps/ims/frontend");
    dir(web, "node_modules/@tailor-platform/app-shell");
    expect(blockPaths(web, join(root, "AGENTS.md"))).toEqual({
      key: "apps/ims/frontend",
      packageRoot: "apps/ims/frontend/node_modules/@tailor-platform/app-shell",
    });
  });

  it("uses `.` for a package at the root", () => {
    const root = tmp();
    expect(blockPaths(root, join(root, "AGENTS.md"))).toEqual({
      key: ".",
      packageRoot: "node_modules/@tailor-platform/app-shell",
    });
  });

  it("follows a hoisted install to the ancestor node_modules", () => {
    const root = tmp();
    dir(root, "node_modules/@tailor-platform/app-shell");
    expect(blockPaths(dir(root, "apps/web"), join(root, "AGENTS.md")).packageRoot).toBe(
      "node_modules/@tailor-platform/app-shell",
    );
  });
});
