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
