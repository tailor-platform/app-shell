/**
 * generate-skill.mjs
 *
 * Reads catalogue entry files, resolves <!-- source: file.tsx --> markers
 * by embedding the referenced file content as fenced code blocks,
 * and outputs:
 *   - skills/app-shell-patterns/SKILL.md (index table)
 *   - skills/app-shell-patterns/references/<category>/<slug>.md (per-entry docs)
 */

import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const catalogueRoot = join(__dirname, "..");
const repoRoot = join(catalogueRoot, "..");
const skillsDir = join(repoRoot, "packages", "core", "skills", "app-shell-patterns");
const referencesDir = join(skillsDir, "references");

/**
 * docs/migrations.md is authored for GitHub but has to reach consumers too:
 * the published package contains only dist/** and skills/**, so a consumer
 * app has no docs/ tree and no CHANGELOG.md to read. Copying it into the
 * skill is the only channel that puts migration steps in node_modules, where
 * coding agents working in a consumer app can actually find them.
 */
const migrationsSource = join(repoRoot, "docs", "migrations.md");
const migrationsOutput = join(referencesDir, "migrations.md");
const repoBlobUrl = "https://github.com/tailor-platform/app-shell/blob/main";

/**
 * Category definitions. To add a new category, append an entry here
 * and add a corresponding {{<templateKey>}} placeholder to SKILL.template.md.
 *
 * - entryFile: marker filename to search recursively (e.g. "PATTERN.md").
 *   If null, all .md files in the category directory are copied as-is.
 */
const CATEGORIES = [
  {
    name: "fundamental",
    entryFile: null,
    outputDir: "fundamental",
    templateKey: "FUNDAMENTAL_TABLE",
  },
  {
    name: "page",
    entryFile: "PAGE.md",
    outputDir: "pages",
    templateKey: "PAGES_TABLE",
  },
  {
    name: "pattern",
    entryFile: "PATTERN.md",
    outputDir: "patterns",
    templateKey: "PATTERNS_TABLE",
  },
];

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

/**
 * Recursively find files matching the given filename in a directory tree.
 */
async function findEntryFiles(dir, filename) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of sortedEntries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findEntryFiles(fullPath, filename)));
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Generate a slug suitable for filenames.
 * e.g., "pattern/list/dense-scan" → "list-dense-scan"
 */
function slugToFilename(slug) {
  const parts = slug.split("/");
  const categoryNames = CATEGORIES.map((c) => c.name);
  if (parts.length > 1 && categoryNames.includes(parts[0])) {
    parts.shift();
  }
  return parts.join("-");
}

/**
 * Process a single category: find entry files, parse/copy them,
 * and write output files.
 *
 * When sourceFile is set, entries are discovered by recursive search
 * for that filename, parsed for frontmatter, and source markers are resolved.
 * When sourceFile is null, all .md files in the category dir are copied as-is.
 */
async function processCategory(category) {
  const categoryDir = join(catalogueRoot, "src", category.name);
  const outputDir = join(referencesDir, category.outputDir);
  await mkdir(outputDir, { recursive: true });

  if (category.entryFile === null) {
    return processCopiedCategory(category, categoryDir, outputDir);
  }
  return processEntryCategory(category, categoryDir, outputDir);
}

async function processCopiedCategory(category, categoryDir, outputDir) {
  const files = await findMarkdownFiles(categoryDir);
  for (const filePath of files) {
    const filename = filePath.split("/").pop();
    const outputPath = join(outputDir, filename);
    await copyFile(filePath, outputPath);
    console.log(`  Generated references/${category.outputDir}/${filename}`);
  }
  return { category, files };
}

async function processEntryCategory(category, categoryDir, outputDir) {
  const entryFiles = await findEntryFiles(categoryDir, category.entryFile);
  const entries = [];

  for (const filePath of entryFiles) {
    const content = await readFile(filePath, "utf-8");
    const { data: meta, content: body, matter: rawFrontmatter } = parseFrontmatter(content);
    if (!meta.slug) {
      console.warn(`Warning: No slug in frontmatter of ${filePath}`);
      continue;
    }

    const entryDir = dirname(filePath);
    const resolvedBody = await resolveSourceMarkers(body.trim(), entryDir);

    entries.push({ meta, body: resolvedBody, rawFrontmatter });
  }

  for (const { meta, body, rawFrontmatter } of entries) {
    const filename = slugToFilename(meta.slug) + ".md";
    const outputPath = join(outputDir, filename);
    const output = `---\n${rawFrontmatter.trim()}\n---\n\n${body}\n`;
    await writeFile(outputPath, output);
    console.log(`  Generated references/${category.outputDir}/${filename}`);
  }

  return { category, entries };
}

/**
 * Copy docs/migrations.md to references/migrations.md.
 *
 * Two transforms are needed because the source is written for GitHub:
 * relative links resolve against docs/, which does not exist in the package,
 * so they become absolute repo URLs; and the frontmatter is dropped to match
 * the other copied reference files.
 */
async function processMigrations() {
  const raw = await readFile(migrationsSource, "utf-8");
  const { content } = parseFrontmatter(raw);

  const body = content
    .trim()
    .replace(
      /\]\((\.{1,2}\/[^)\s]+)\)/g,
      (_match, target) => `](${repoBlobUrl}/${join("docs", target)})`,
    );

  await mkdir(referencesDir, { recursive: true });
  await writeFile(migrationsOutput, `${body}\n`);
  console.log("  Generated references/migrations.md");
}

async function main() {
  // Process all categories
  const results = [];
  for (const category of CATEGORIES) {
    const result = await processCategory(category);
    results.push(result);
  }

  await processMigrations();

  // Generate SKILL.md index
  const skillMd = await generateSkillIndex(results);
  await writeFile(join(skillsDir, "SKILL.md"), skillMd);
  console.log(`  Generated SKILL.md`);

  const total = results.reduce((sum, r) => sum + (r.entries?.length ?? r.files?.length ?? 0), 0);
  console.log(
    `\nDone: ${total} file(s) across ${results.length} categories → skills/app-shell-patterns/`,
  );
}

/**
 * Generate an index table for entry-based categories (with frontmatter).
 */
function formatMarkdownTable(rows) {
  const widths = rows[0].map((_, columnIndex) =>
    Math.max(...rows.map((row) => String(row[columnIndex]).length)),
  );

  const renderRow = (row) =>
    `| ${row.map((cell, columnIndex) => String(cell).padEnd(widths[columnIndex])).join(" | ")} |`;

  return [
    renderRow(rows[0]),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...rows.slice(1).map(renderRow),
  ].join("\n");
}

function generateEntryTable(entries, outputDir) {
  if (entries.length === 0) return "";

  const grouped = new Map();
  for (const { meta } of [...entries].sort((a, b) => a.meta.slug.localeCompare(b.meta.slug))) {
    // Group by subcategory only. Without one the heading would just repeat
    // the category (### page under "Available Pages"), so those entries
    // render as a bare table — and a category can introduce subcategories
    // later with no change here.
    const key = meta.subcategory ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(meta);
  }

  return [...grouped.entries()]
    .map(([group, items]) => {
      const rows = [
        ["Slug", "Name", "Description"],
        ...items.map((item) => {
          const filename = slugToFilename(item.slug) + ".md";
          const displaySlug = item.slug.replace(/^[^/]+\//, "");
          return [
            `[\`${displaySlug}\`](references/${outputDir}/${filename})`,
            item.name,
            item.description,
          ];
        }),
      ];

      const table = formatMarkdownTable(rows);
      return group === null ? table : `### ${group}\n\n${table}`;
    })
    .join("\n\n");
}

/**
 * Generate an index table for copied categories (plain .md files).
 */
function generateCopiedTable(files, outputDir) {
  if (files.length === 0) return "";

  const rows = [
    ["File", "Description"],
    ...[...files].sort().map((filePath) => {
      const filename = filePath.split("/").pop();
      const name = filename.replace(".md", "");
      return [`[${filename}](references/${outputDir}/${filename})`, `${name} reference`];
    }),
  ];

  return formatMarkdownTable(rows);
}

async function findMarkdownFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() && entry.name.endsWith(".md")) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

function generateTable(result) {
  if (result.entries) {
    return generateEntryTable(result.entries, result.category.outputDir);
  }
  return generateCopiedTable(result.files, result.category.outputDir);
}

async function generateSkillIndex(results) {
  const templatePath = join(__dirname, "SKILL.template.md");
  let template = await readFile(templatePath, "utf-8");

  for (const result of results) {
    const table = generateTable(result);
    template = template.replace(`{{${result.category.templateKey}}}`, table);
  }

  return template;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
