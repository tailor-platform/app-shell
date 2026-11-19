/** Every user-facing name the CLI exposes. Naming is still open on the ticket,
 * so the commands, the bin and the injected `prepare` line all read from here. */
export const BIN = "app-shell";
export const PACKAGE_NAME = "@tailor-platform/app-shell";

export const COMMANDS = {
  init: ["agents", "init"],
  sync: ["agents", "sync"],
} as const;

export type CommandName = keyof typeof COMMANDS;

export const commandLine = (name: CommandName): string => [BIN, ...COMMANDS[name]].join(" ");

/** Linked from CLI notices. The guide is not in the package's docs. */
export const GUIDE_URL =
  "https://github.com/tailor-platform/app-shell/blob/main/docs/coding-agents.md";

/** Default file the block is written to, at the repo root. */
export const AGENTS_FILE = "AGENTS.md";

/** Where docs-kit emits the block inside the package. Must match
 * `outputs.agents.blockFile` in docs-kit.config.json; a test holds the two together. */
export const BLOCK_FILE = "dist/agents/AGENTS.block.md";
