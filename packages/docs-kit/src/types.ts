/** A documentable unit either owns exported symbols (and therefore has a
 * hashable type surface) or it does not. Declared in frontmatter, never
 * inferred — see decisions/documentation-management-overhaul.md. */
export type UnitKind = "code-backed" | "prose";

/** The closed frontmatter schema. Every key a unit's behaviour depends on is
 * declared here; `OUTLINE_KEYS` in outline.ts is derived from it and any key
 * outside that set is a blocking error rather than a silent no-op. */
export interface OutlineFrontmatter {
  /** REQUIRED. Whether this unit owns exported symbols. Never inferred. */
  kind: UnitKind;
  /** REQUIRED. Slug — output is `<category>/<group>.md`. */
  group: string;
  /** REQUIRED. */
  title: string;
  /** REQUIRED. One line; feeds the route stub and the consumer skill. */
  description: string;
  /** Required iff `kind` is "code-backed", forbidden otherwise: globs
   * (repo-relative) whose exported symbols this unit owns. */
  sources?: string[];
  /** Optional on either kind: names of re-exported symbols this unit documents.
   * Orthogonal to `kind` — a code-backed unit may hash what its `sources` own
   * AND claim the re-exports its prose covers. */
  claims?: string[];
  /** Upstream docs URL for claimed symbols. */
  upstream?: string;

  // Presentation metadata for pattern and page units — consumed by the
  // generated `app-shell-patterns` skill (see skill.ts).
  /** Catalogue-era display path, e.g. `pattern/form/composer`. */
  slug?: string;
  /** Display name in the skill's pattern table. */
  name?: string;
  category?: string;
  /** Groups rows within the skill's pattern/page tables. */
  subcategory?: string;
  requiredImports?: string[];
  tags?: string[];
  do?: string[];
  dont?: string[];
}

export interface Outline {
  kind: UnitKind;
  slug: string;
  /** Absolute path to the outline file. */
  outlinePath: string;
  /** Repo-relative path to the outline file. */
  outlineRel: string;
  frontmatter: OutlineFrontmatter;
  /** Markdown body with frontmatter stripped. */
  body: string;
  /** Repo-relative output directory. */
  outDir: string;
  /** Repo-relative path of the generated markdown. */
  mdPath: string;
  /** Repo-relative path of the (authored) examples module. */
  examplesPath: string;
}

export interface UnitHashes {
  /** Resolved type-surface hash — null for prose units. */
  typeSurface: string | null;
  outline: string;
  /** Advisory only. */
  snapshot: string | null;
  outputMd: string | null;
  examples: string | null;
}

export interface ManifestEntry {
  slug: string;
  kind: UnitKind;
  outline: string;
  output: string;
  examples: string | null;
  sources: string[];
  claims: string[];
  /** Resolved public export names this unit owns via `sources`, plus its `claims`. */
  symbols: string[];
  hashes: UnitHashes;
}

export interface Manifest {
  version: number;
  units: Record<string, ManifestEntry>;
  /** Generated skill file (repo-relative) -> content hash. Absent when no skill is configured. */
  skill?: Record<string, string>;
}

export interface CategoryRule {
  /** Glob (repo-relative) matched against an outline's path. */
  match: string;
  /** Repo-relative output directory for matching outlines. */
  outDir: string;
}

export interface SkillConfig {
  /** Repo-relative output dir for the generated consumer skill. */
  outDir: string;
  /** Repo-relative SKILL.md template with {{CATEGORY_TABLE}} placeholders. */
  templatePath: string;
  /** Repo-relative dir of authored fundamental guidance copied verbatim. */
  fundamentalDir: string;
  /** Repo-relative migrations doc copied (with links rewritten) into the skill. */
  migrationsSource: string;
  /** Base blob URL for rewriting the migrations doc's relative links. */
  repoBlobUrl: string;
}

export interface DocsConfig {
  /** Repo-relative roots scanned for `*.docs-outline.md`. */
  roots: string[];
  /** Repo-relative tsconfig used to load the type project. */
  tsconfig: string;
  /** Repo-relative entry file defining the public surface. */
  indexFile: string;
  /** Repo-relative manifest path. */
  manifestFile: string;
  categories: CategoryRule[];
  /** When false (migration phase), uncovered exports warn instead of blocking. */
  enforceCoverage: boolean;
  /** Export names deliberately left undocumented (rare escape hatch). */
  exclusions: string[];
  /** Repo-relative dir holding centralized test snapshots (advisory signal). */
  snapshotDir?: string;
  /** Repo-relative dir of the docs-browser's file-based routes. When set, sync
   * generates a per-unit `<category>/<slug>/page.tsx` route stub here so new
   * units appear in the browser with zero manual wiring. */
  pagesDir?: string;
  /** Consumer-skill generation. When set, sync emits it and check validates it. */
  skill?: SkillConfig;
}
