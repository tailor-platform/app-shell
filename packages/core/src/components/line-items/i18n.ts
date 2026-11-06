import { defineI18nLabels } from "@/hooks/i18n";

const labels = defineI18nLabels({
  en: {
    title: "Line items",
    empty: "No lines yet.",
    noMatches: "No matching lines.",
    search: "Search line items",
    searchPlaceholder: "Search line items...",
    searchResults: ({ count, total }: { count: number; total: number }) =>
      `${count} of ${total} lines shown.`,
    actions: "Actions",
    bulkActions: "Bulk actions",
    moreActions: "More actions",
    clear: "Clear",
    clearSelection: "Clear selection",
    selectionCount: ({ selected, total }: { selected: number; total: number }) =>
      `${selected} of ${total} selected`,
    selectAllVisible: "Select all visible lines",
    selectRow: ({ index }: { index: number }) => `Select line ${index}`,
    reorder: "Reorder",
    reorderRow: ({ index }: { index: number }) => `Reorder line ${index}`,
    reorderKeys: "Drag to reorder, or use ArrowUp and ArrowDown.",
    reorderedRow: ({ index, position }: { index: number; position: number }) =>
      `Line ${index} moved to position ${position}.`,
    row: ({ index }: { index: number }) => `line ${index}`,
    invalidNumber: "Enter a valid number.",
    invalidDate: "Enter a valid date within the allowed range.",
    invalidValue: "Enter a valid value.",
    commitError: "The value could not be confirmed.",
    errorHint: "Press Alt+ArrowDown to inspect the error.",
    showError: ({ label }: { label: string }) => `Show error for ${label}`,
    errorDialog: ({ label }: { label: string }) => `Error for ${label}`,
    closeError: "Close error details",
  },
  ja: {
    title: "明細",
    empty: "明細がありません。",
    noMatches: "一致する明細がありません。",
    search: "明細を検索",
    searchPlaceholder: "明細を検索...",
    searchResults: ({ count, total }: { count: number; total: number }) =>
      `${total}件中${count}件の明細を表示。`,
    actions: "行操作",
    bulkActions: "一括操作",
    moreActions: "その他の操作",
    clear: "解除",
    clearSelection: "選択を解除",
    selectionCount: ({ selected, total }: { selected: number; total: number }) =>
      `${total} 行中 ${selected} 行を選択中`,
    selectAllVisible: "表示中の明細をすべて選択",
    selectRow: ({ index }: { index: number }) => `行${index}を選択`,
    reorder: "並び替え",
    reorderRow: ({ index }: { index: number }) => `行${index}を並び替え`,
    reorderKeys: "ドラッグ、または上下矢印キーで並び替えます。",
    reorderedRow: ({ index, position }: { index: number; position: number }) =>
      `行${index}を${position}行目に移動しました。`,
    row: ({ index }: { index: number }) => `行${index}`,
    invalidNumber: "有効な数値を入力してください。",
    invalidDate: "指定された範囲の有効な日付を入力してください。",
    invalidValue: "有効な値を入力してください。",
    commitError: "値を確定できませんでした。",
    errorHint: "Alt+ArrowDownでエラーの詳細を確認できます。",
    showError: ({ label }: { label: string }) => `${label}のエラーを表示`,
    errorDialog: ({ label }: { label: string }) => `${label}のエラー`,
    closeError: "エラーの詳細を閉じる",
  },
});

export const useLineItemsT = labels.useT;
