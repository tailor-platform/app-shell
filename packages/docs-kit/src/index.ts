export { loadConfig } from "./config";
export { discoverOutlines } from "./outline";
export {
  loadSurface,
  snapshotHashForSlug,
  type Surface,
  type PublicSymbol,
  type PropRow,
} from "./project";
export { ownedSymbols, reconcile, type Finding } from "./coverage";
export { assembleMarkdown } from "./assemble";
export { readManifest, writeManifest } from "./manifest";
export { sync, type SyncResult } from "./sync";
export { check, type CheckResult } from "./check";
export * from "./types";
export { hash, normalizeText } from "./hash";
