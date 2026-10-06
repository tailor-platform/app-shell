import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const workspace = resolve(process.argv[2] ?? process.cwd());
const require = createRequire(join(workspace, "package.json"));
let entry;

try {
  entry = require.resolve("@tailor-platform/app-shell");
} catch {
  console.error(
    `Cannot resolve @tailor-platform/app-shell from ${workspace}. Run this script from the workspace that depends on app-shell, or pass that workspace directory as an argument. Install app-shell there if it is missing.`,
  );
  process.exit(1);
}

const index = join(resolve(entry, "../.."), "docs", "index.md");
if (!existsSync(index)) {
  console.error(
    `Bundled documentation is missing: ${index}. Upgrade @tailor-platform/app-shell to a version that includes docs/index.md.`,
  );
  process.exit(1);
}

console.log(index);
