import { defineI18nLabels } from "@/hooks/i18n";

const labels = defineI18nLabels({
  en: {
    title: "Line items",
    empty: "No lines yet.",
    order: "Order",
    reorder: ({ line }: { line: number }) => `Reorder line ${line}`,
    dragToReorder: "Drag to reorder, or use the Up and Down arrow keys",
    moved: ({ from, to }: { from: number; to: number }) => `Moved line ${from} to position ${to}.`,
  },
  ja: {
    title: "明細",
    empty: "明細がありません。",
    order: "並び順",
    reorder: ({ line }) => `${line}行目の並び替え`,
    dragToReorder: "ドラッグ、または上下の矢印キーで並び替え",
    moved: ({ from, to }) => `${from}行目を${to}行目へ移動しました。`,
  },
});

export const useLineItemsT = labels.useT;
