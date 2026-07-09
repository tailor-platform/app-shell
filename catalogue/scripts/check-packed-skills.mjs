import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const catalogueRoot = join(__dirname, "..");
const repoRoot = join(catalogueRoot, "..");
const expectedManifestPath = join(catalogueRoot, "expected-skills-files.txt");

function parseManifest(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function diffLists(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  return {
    missing: expected.filter((file) => !actualSet.has(file)),
    extra: actual.filter((file) => !expectedSet.has(file)),
  };
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), "app-shell-pack-"));

  try {
    await execFileAsync(
      "pnpm",
      ["--filter", "@tailor-platform/app-shell", "pack", "--pack-destination", tempDir],
      { cwd: repoRoot },
    );

    const tarballs = (await readdir(tempDir)).filter((file) => file.endsWith(".tgz"));
    if (tarballs.length !== 1) {
      throw new Error(`Expected exactly one tarball, found ${tarballs.length}`);
    }

    const tarballPath = join(tempDir, tarballs[0]);
    const [{ stdout: tarList }, expectedManifest] = await Promise.all([
      execFileAsync("tar", ["-tf", tarballPath], { cwd: repoRoot }),
      readFile(expectedManifestPath, "utf8"),
    ]);

    const actualSkillsFiles = tarList
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("package/skills/") && !line.endsWith("/"))
      .map((line) => line.replace(/^package\//, ""))
      .sort();
    const expectedSkillsFiles = parseManifest(expectedManifest);

    const { missing, extra } = diffLists(expectedSkillsFiles, actualSkillsFiles);
    if (missing.length === 0 && extra.length === 0) {
      console.log(`Packed skills manifest matches expected (${actualSkillsFiles.length} files).`);
      return;
    }

    console.error("Packed skills manifest does not match catalogue/expected-skills-files.txt");
    if (missing.length > 0) {
      console.error("\nMissing:");
      for (const file of missing) console.error(`  - ${file}`);
    }
    if (extra.length > 0) {
      console.error("\nExtra:");
      for (const file of extra) console.error(`  - ${file}`);
    }

    process.exitCode = 1;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
