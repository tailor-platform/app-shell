/**
 * generate-skill.mjs
 *
 * Reads all PATTERN.md files, resolves <!-- source: file.tsx --> markers
 * by embedding the referenced file content as fenced code blocks,
 * and outputs:
 *   - skills/app-shell-patterns/SKILL.md (index table)
 *   - skills/app-shell-patterns/patterns/<slug>.md (per-pattern docs)
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const catalogueRoot = join(__dirname, "..");
const repoRoot = join(catalogueRoot, "..");
const skillsDir = join(repoRoot, "skills", "app-shell-patterns");
const patternsOutputDir = join(skillsDir, "patterns");

const CATEGORIES = ["pattern", "screen", "recipe"];

/**
 * Resolve <!-- source: file.tsx --> markers in markdown body.
 * Reads the referenced file relative to the PATTERN.md directory
 * and replaces the marker with a fenced code block.
 */
async function resolveSourceMarkers(body, patternDir) {
  const sourceRegex = /<!--\s*source:\s*(.+?)\s*-->/g;
  let result = body;
  let match;

  // Collect all matches first to avoid issues with async replacement
  const replacements = [];
  while ((match = sourceRegex.exec(body)) !== null) {
    const filename = match[1];
    const filePath = join(patternDir, filename);
    try {
      const content = await readFile(filePath, "utf-8");
      const ext = filename.split(".").pop();
      replacements.push({
        original: match[0],
        replacement: `\`\`\`${ext}\n${content.trim()}\n\`\`\``,
      });
    } catch (err) {
      console.warn(`Warning: Could not read ${filePath}: ${err.message}`);
    }
  }

  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }

  return result;
}

async function findPatternFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findPatternFiles(fullPath)));
    } else if (entry.name === "PATTERN.md") {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Generate a slug suitable for filenames from the pattern slug.
 * e.g., "pattern/list/dense-scan" → "list-dense-scan"
 */
function slugToFilename(slug) {
  // Remove the category prefix (pattern/, screen/, recipe/)
  const parts = slug.split("/");
  if (parts.length > 1 && CATEGORIES.includes(parts[0])) {
    parts.shift();
  }
  return parts.join("-");
}

async function main() {
  const patterns = [];

  for (const category of CATEGORIES) {
    const categoryDir = join(catalogueRoot, category);
    const patternFiles = await findPatternFiles(categoryDir);

    for (const filePath of patternFiles) {
      const content = await readFile(filePath, "utf-8");
      const { data: meta, content: body, matter: rawFrontmatter } = matter(content);
      if (!meta.slug) {
        console.warn(`Warning: No slug in frontmatter of ${filePath}`);
        continue;
      }

      const patternDir = dirname(filePath);
      const resolvedBody = await resolveSourceMarkers(body.trim(), patternDir);

      patterns.push({
        meta,
        body: resolvedBody,
        rawFrontmatter,
      });
    }
  }

  // Ensure output directories exist
  await mkdir(patternsOutputDir, { recursive: true });

  // Generate per-pattern markdown files
  for (const { meta, body, rawFrontmatter } of patterns) {
    const filename = slugToFilename(meta.slug) + ".md";
    const outputPath = join(patternsOutputDir, filename);
    const output = `---\n${rawFrontmatter}\n---\n\n${body}\n`;
    await writeFile(outputPath, output);
    console.log(`  Generated patterns/${filename}`);
  }

  // Generate SKILL.md index
  const skillMd = await generateSkillIndex(patterns);
  await writeFile(join(skillsDir, "SKILL.md"), skillMd);
  console.log(`  Generated SKILL.md`);

  console.log(`\nDone: ${patterns.length} pattern(s) → skills/app-shell-patterns/`);
}

function generatePatternsTable(patterns) {
  // Group patterns by category/subcategory
  const grouped = {};
  for (const { meta } of patterns) {
    const key = meta.subcategory ? `${meta.category}/${meta.subcategory}` : meta.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(meta);
  }

  let table = "";
  for (const [group, items] of Object.entries(grouped)) {
    table += `### ${group}\n\n`;
    table += `| Slug | Name | Description |\n`;
    table += `| ---- | ---- | ----------- |\n`;
    for (const item of items) {
      table += `| \`${item.slug}\` | ${item.name} | ${item.description} |\n`;
    }
    table += `\n`;
  }

  return table.trim();
}

async function generateSkillIndex(patterns) {
  const templatePath = join(__dirname, "SKILL.template.md");
  const template = await readFile(templatePath, "utf-8");
  return template.replace("{{PATTERNS_TABLE}}", generatePatternsTable(patterns));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
