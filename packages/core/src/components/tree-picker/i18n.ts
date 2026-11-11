// Loaded first on purpose: `@/hooks/i18n` reaches back to itself through this
// context, so a module graph entered via the labels sees `defineI18nLabels`
// as undefined. Entering via the context is safe.
import "@/contexts/appshell-context";
import { defineI18nLabels } from "@/hooks/i18n";

export const treePickerLabels = defineI18nLabels({
  en: {
    title: "Select items",
    searchPlaceholder: "Search",
    searchLabel: "Search items",
    cancel: "Cancel",
    addItems: "Add items",
    addCount: (props: { count: number }) =>
      `Add ${props.count} ${props.count === 1 ? "item" : "items"}`,
  },
  ja: {
    title: "項目を選択",
    searchPlaceholder: "検索",
    searchLabel: "項目を検索",
    cancel: "キャンセル",
    addItems: "項目を追加",
    addCount: (props: { count: number }) => `${props.count} 件を追加`,
  },
});

export const useTreePickerT = treePickerLabels.useT;
