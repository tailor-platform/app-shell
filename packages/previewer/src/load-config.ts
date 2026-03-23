import { loadConfig } from "c12";
import type { PreviewerConfig } from "./config";

export async function loadPreviewerConfig(cwd: string): Promise<PreviewerConfig> {
  const { config } = await loadConfig<PreviewerConfig>({
    name: "previewer",
    cwd,
  });
  return config ?? {};
}
