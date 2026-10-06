import { cpSync, existsSync, rmSync } from "node:fs";

const source = new URL("../../../docs/", import.meta.url);
const destination = new URL("../docs/", import.meta.url);

if (!existsSync(new URL("index.md", source))) {
  throw new Error(
    "bundle-docs: missing generated docs/index.md. Run `pnpm docs:sync` from the repository root before packing.",
  );
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
