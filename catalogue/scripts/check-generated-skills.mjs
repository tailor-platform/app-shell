/**
 * Verifies that the generated skills tree under packages/core/skills matches
 * the expected file manifest from catalogue/expected-skills-files.txt.
 *
 * Purpose: keep generated skills out of git while still catching drift between
 * catalogue inputs and the generated output during test runs.
 */
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const catalogueRoot = join(__dirname, "..");
const repoRoot = join(catalogueRoot, "..");
const expectedManifestPath = join(catalogueRoot, "expected-skills-files.txt");
const corePackageRoot = join(repoRoot, "packages", "core");
const skillsRoot = join(corePackageRoot, "skills");

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

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

async function main() {
  const [expectedManifest, actualFiles] = await Promise.all([
    readFile(expectedManifestPath, "utf8"),
    listFiles(skillsRoot),
  ]);

  const actualSkillsFiles = actualFiles
    .map((filePath) => relative(corePackageRoot, filePath))
    .sort();
  const expectedSkillsFiles = parseManifest(expectedManifest);

  const { missing, extra } = diffLists(expectedSkillsFiles, actualSkillsFiles);
  if (missing.length === 0 && extra.length === 0) {
    console.log(`Skills manifest matches expected (${actualSkillsFiles.length} files).`);
    return;
  }

  console.error("Skills manifest does not match catalogue/expected-skills-files.txt");
  if (missing.length > 0) {
    console.error("\nMissing:");
    for (const file of missing) console.error(`  - ${file}`);
  }
  if (extra.length > 0) {
    console.error("\nExtra:");
    for (const file of extra) console.error(`  - ${file}`);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
