import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const skillsDir = fileURLToPath(new URL("../skills", import.meta.url));

await rm(skillsDir, { recursive: true, force: true });
