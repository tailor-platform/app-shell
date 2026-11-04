import { defineI18nLabels } from "@/hooks/i18n";

const labels = defineI18nLabels({
  en: {
    title: "Line items",
    empty: "No lines yet.",
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
