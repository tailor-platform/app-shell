import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const coreRoot = fileURLToPath(new URL("..", import.meta.url));
const packDir = mkdtempSync(join(tmpdir(), "app-shell-pack-"));

try {
  execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: coreRoot,
    stdio: "inherit",
  });

  const tarball = readdirSync(packDir).find((file) => file.endsWith(".tgz"));
  assert(tarball, "pnpm pack did not create a tarball");

  const archive = gunzipSync(readFileSync(join(packDir, tarball))).toString("latin1");

  for (const file of [
    "package/skills/app-shell-patterns/SKILL.md",
    "package/skills/app-shell-patterns/references/migrations.md",
    "package/skills/app-shell-patterns/references/fundamental/components.md",
    "package/skills/app-shell-patterns/references/patterns/list-dense-scan.md",
  ]) {
    assert(archive.includes(file), `Missing generated skill file from package: ${file}`);
  }

  assert(!existsSync(join(coreRoot, "skills")), "postpack must remove generated skills");
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(join(coreRoot, "skills"), { recursive: true, force: true });
}
