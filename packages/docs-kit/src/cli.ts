#!/usr/bin/env node
import { check } from "./check";
import type { Finding } from "./coverage";
import { sync } from "./sync";

function printFindings(findings: Finding[]): void {
  for (const f of findings) {
    const tag = f.level === "block" ? "✖ BLOCK" : "⚠ warn ";
    const where = f.slug ? `[${f.slug}] ` : "";
    console.log(`  ${tag}  ${where}${f.message}`);
  }
}

function resolveRoot(argv: string[]): string {
  const i = argv.indexOf("--root");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : process.cwd();
}

const cmd = process.argv[2];
const repoRoot = resolveRoot(process.argv);

if (cmd === "sync") {
  const { written, findings } = sync(repoRoot);
  console.log(`docs-kit sync — wrote ${written.length} document(s):`);
  for (const w of written) console.log(`  • ${w}`);
  if (findings.length > 0) {
    console.log("\nfindings:");
    printFindings(findings);
  }
  process.exit(0);
} else if (cmd === "check") {
  const { findings, ok } = check(repoRoot);
  if (findings.length === 0) {
    console.log("docs-kit check — ✓ all units in sync.");
  } else {
    console.log("docs-kit check:");
    printFindings(findings);
    console.log(ok ? "\n✓ no blocking issues (advisories only)." : "\n✖ blocking issues found.");
  }
  process.exit(ok ? 0 : 1);
} else {
  console.log("usage: docs-kit <check|sync> [--root <dir>]");
  process.exit(2);
}
