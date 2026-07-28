/** A documentable unit is code-backed (owns exported symbols), a reference to
 * re-exported third-party API, or free prose (concepts / patterns). */
export type UnitKind = "code-backed" | "reference" | "prose";

export interface OutlineFrontmatter {
  /** Slug override; defaults to the filename minus `.docs-outline.md`. */
  group?: string;
  title?: string;
  description?: string;
  /** Code-backed units: globs (repo-relative) whose exported symbols this unit owns. */
  sources?: string[];
  /** Reference units: names of re-exported symbols this unit documents. */
  claims?: string[];
  /** Reference units: upstream docs URL. */
  upstream?: string;
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
  /** Resolved type-surface hash — null for reference/prose units. */
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
  /** Resolved public export names this unit owns (code-backed) or claims (reference). */
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
