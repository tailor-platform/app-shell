import { commandLine } from "./names";

export type PrepareStatus = "added" | "present" | "differs";

/** Add `command` to a `prepare` script. `differs` means a sync command with
 * other arguments is already there; it is left alone rather than run twice. */
export function chainPrepare(
  existing: string | undefined,
  command: string,
): { script: string; status: PrepareStatus } {
  const current = existing?.trim() ?? "";
  if (!current) return { script: command, status: "added" };
  if (current.split("&&").some((part) => part.trim() === command)) {
    return { script: current, status: "present" };
  }
  if (current.includes(commandLine("sync"))) return { script: current, status: "differs" };
  return { script: `${current} && ${command}`, status: "added" };
}

/** Set `scripts.prepare` in package.json text, keeping its indentation and
 * trailing newline so the diff is the one line. */
export function setPrepareScript(packageJson: string, script: string): string {
  const indent = packageJson.match(/^([ \t]+)"/m)?.[1] ?? "  ";
  const pkg = JSON.parse(packageJson) as { scripts?: Record<string, string> };
  pkg.scripts = { ...pkg.scripts, prepare: script };
  return `${JSON.stringify(pkg, null, indent)}${packageJson.endsWith("\n") ? "\n" : ""}`;
}
