import { recommended } from "@tailor-platform/eslint-plugin-app-shell";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [recommended],
  rules: { "@tailor-platform/app-shell/prefer-text-components": "warn" },
});
