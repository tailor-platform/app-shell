// Loaded first on purpose: `@/hooks/i18n` reaches back to itself through this
// context, so a module graph entered via the labels sees `defineI18nLabels`
// as undefined. Entering via the context is safe.
import "@/contexts/appshell-context";
import { defineI18nLabels } from "@/hooks/i18n";

export const lineItemsLabels = defineI18nLabels({
  en: {
    // Root (fullscreen overlay's accessible name)
    fullscreenLabel: "Line items",

    // FullscreenToggle
    enterFullscreen: "Expand to fullscreen",
    exitFullscreen: "Exit fullscreen",

    // SaveActions / DirtyBar
    saveChanges: "Save changes",
    save: "Save",
    discard: "Discard",
    unsavedChanges: (props: { count: number }) =>
      `${props.count} unsaved ${props.count === 1 ? "change" : "changes"}`,
    // Announced when a link is blocked because the document has unsaved edits.
    unsavedNavBlocked: "Unsaved changes. Save or discard them before leaving.",

    // Table
    emptyMessage: "No lines yet.",
    selectAllLines: "Select all lines",
    // Screen-reader names for the utility column headers.
    reorderColumn: "Reorder",
    actionsColumn: "Actions",
    selectLine: (props: { line: number }) => `Select line ${props.line}`,
    reorderLine: (props: { line: number }) => `Drag to reorder line ${props.line}`,
    lineMoved: (props: { line: number; position: number }) =>
      `Line ${props.line} moved to position ${props.position}`,
    // Accessible name for a cell editor: column, then line.
    cellLabel: (props: { column: string; line: number }) => `${props.column}, line ${props.line}`,

    // Select cell
    noMatches: "No matches.",
    fixErrors: (props: { count: number }) =>
      props.count === 1 ? "Fix 1 error to save" : `Fix ${props.count} errors to save`,
    loadingOptions: "Loading…",
    loadOptionsFailed: "Couldn't load options.",
    retry: "Retry",
  },
  ja: {
    fullscreenLabel: "明細",

    enterFullscreen: "全画面で表示",
    exitFullscreen: "全画面を終了",

    saveChanges: "変更を保存",
    save: "保存",
    discard: "破棄",
    unsavedChanges: (props: { count: number }) => `未保存の変更 ${props.count} 件`,
    unsavedNavBlocked: "未保存の変更があります。移動する前に保存または破棄してください。",

    emptyMessage: "明細はまだありません。",
    selectAllLines: "すべての明細を選択",
    reorderColumn: "並べ替え",
    actionsColumn: "操作",
    selectLine: (props: { line: number }) => `${props.line} 行目を選択`,
    reorderLine: (props: { line: number }) => `${props.line} 行目をドラッグして並べ替え`,
    lineMoved: (props: { line: number; position: number }) =>
      `${props.line} 行目を ${props.position} 番目に移動しました`,
    cellLabel: (props: { column: string; line: number }) => `${props.column}、${props.line} 行目`,

    noMatches: "一致する項目がありません。",
    fixErrors: (props: { count: number }) =>
      `保存するには ${props.count} 件のエラーを修正してください`,
    loadingOptions: "読み込み中…",
    loadOptionsFailed: "候補を読み込めませんでした。",
    retry: "再試行",
  },
});

export const useLineItemsT = lineItemsLabels.useT;
