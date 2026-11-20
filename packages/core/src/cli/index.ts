#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { BLOCK_FILE } from "./names";
import { run } from "./run";

process.exitCode = run(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  // Resolved from the built `dist/cli.mjs`, one level below the package root.
  blockFile: fileURLToPath(new URL(`../${BLOCK_FILE}`, import.meta.url)),
  log: (message) => console.log(message),
  warn: (message) => console.warn(message),
});
