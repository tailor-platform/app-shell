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
  /** REQUIRED. One line; feeds the generated frontmatter and documentation index. */
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

  // Authored pattern/page metadata describing each recipe.
  /** Catalogue-era display path, e.g. `pattern/form/composer`. */
  slug?: string;
  /** Display name of the recipe. */
  name?: string;
  category?: string;
  /** Recipe grouping within its category. */
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
  /** Only for index units: catalogue content derived from all outline metadata. */
  catalogue?: string;
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
}

export interface CategoryRule {
  /** Glob (repo-relative) matched against an outline's path. */
  match: string;
  /** Repo-relative output directory for matching outlines. */
  outDir: string;
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
}
