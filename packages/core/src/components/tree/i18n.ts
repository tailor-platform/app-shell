// Loaded first on purpose: `@/hooks/i18n` reaches back to itself through this
// context, so a module graph entered via the labels sees `defineI18nLabels`
// as undefined. Entering via the context is safe.
import "@/contexts/appshell-context";
import { defineI18nLabels } from "@/hooks/i18n";

export const treeLabels = defineI18nLabels({
  en: {
    noItems: "No items.",
    emptyText: "No matching items.",
    expand: "Expand",
    collapse: "Collapse",
  },
  ja: {
    noItems: "項目がありません。",
    emptyText: "一致する項目がありません。",
    expand: "展開",
    collapse: "折りたたむ",
  },
});

export const useTreeT = treeLabels.useT;
