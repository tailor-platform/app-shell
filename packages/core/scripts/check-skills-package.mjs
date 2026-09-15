import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const coreRoot = fileURLToPath(new URL("..", import.meta.url));
const skillsDir = join(coreRoot, "skills");
const packDir = mkdtempSync(join(tmpdir(), "app-shell-pack-"));

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

try {
  execFileSync(process.execPath, ["scripts/generate-skills.mjs"], {
    cwd: coreRoot,
    stdio: "inherit",
  });
  const expectedSkillFiles = listFiles(skillsDir).map((file) =>
    join("package", relative(coreRoot, file)),
  );

  execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: coreRoot,
    stdio: "inherit",
  });

  const tarball = readdirSync(packDir).find((file) => file.endsWith(".tgz"));
  assert(tarball, "pnpm pack did not create a tarball");

  const archive = gunzipSync(readFileSync(join(packDir, tarball))).toString("latin1");

  for (const file of expectedSkillFiles) {
    assert(archive.includes(file), `Missing generated skill file from package: ${file}`);
  }

  assert(!existsSync(skillsDir), "postpack must remove generated skills");
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(skillsDir, { recursive: true, force: true });
}
