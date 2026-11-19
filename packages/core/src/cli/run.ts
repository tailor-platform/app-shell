import { type AgentsOptions, type CliContext, init, sync } from "./agents";
import { COMMANDS, type CommandName, commandLine } from "./names";

const USAGE = `Usage:
  ${commandLine("init")} [--target <path>]   Add the AppShell block to the repo's AGENTS.md and refresh it on install
  ${commandLine("sync")} [--target <path>]   Refresh an existing block (run from "prepare")

Run both from the package that depends on @tailor-platform/app-shell.
--target sets the file the block lives in (default: AGENTS.md at the repo root).`;

function matchCommand(argv: string[]): { name: CommandName; rest: string[] } | null {
  for (const name of Object.keys(COMMANDS) as CommandName[]) {
    const words = COMMANDS[name];
    if (words.every((word, i) => argv[i] === word)) return { name, rest: argv.slice(words.length) };
  }
  return null;
}

function parseOptions(args: string[]): AgentsOptions {
  const options: AgentsOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--target" && args[i + 1]) options.target = args[++i];
    else if (arg.startsWith("--target=") && arg.length > "--target=".length) {
      options.target = arg.slice("--target=".length);
    } else throw new Error(`unknown or incomplete argument "${arg}"`);
  }
  return options;
}

/** Returns the process exit code. */
export function run(argv: string[], ctx: CliContext): number {
  const command = matchCommand(argv);
  if (command?.name === "sync") {
    // Runs inside the consumer's install: a failure here must never fail it.
    try {
      sync(ctx, parseOptions(command.rest));
    } catch (error) {
      ctx.warn(`${commandLine("sync")}: skipped (${(error as Error).message})`);
    }
    return 0;
  }
  if (command?.name === "init") {
    try {
      return init(ctx, parseOptions(command.rest));
    } catch (error) {
      ctx.warn(`${commandLine("init")}: ${(error as Error).message}`);
      return 1;
    }
  }
  const help = argv.length === 0 || argv.includes("--help") || argv.includes("-h");
  (help ? ctx.log : ctx.warn)(USAGE);
  return help ? 0 : 2;
}
