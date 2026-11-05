import { defineI18nLabels } from "@/hooks/i18n";

const labels = defineI18nLabels({
  en: { title: "Line items", empty: "No lines yet." },
  ja: { title: "明細", empty: "明細がありません。" },
});

export const useLineItemsT = labels.useT;
