// Loaded first on purpose: `@/hooks/i18n` reaches back to itself through this
// context, so a module graph entered via the labels sees `defineI18nLabels`
// as undefined. Entering via the context is safe.
import "@/contexts/appshell-context";
import { defineI18nLabels } from "@/hooks/i18n";

export const lineItemsLabels = defineI18nLabels({
  en: {
    // Root (fullscreen overlay's accessible name)
    fullscreenLabel: "Line items",

    // Search / SearchToggle
    searchPlaceholder: "Search lines",
    searchLabel: "Search lines",

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
    selectLine: (props: { line: number }) => `Select line ${props.line}`,
    reorderLine: (props: { line: number }) => `Drag to reorder line ${props.line}`,
    lineMoved: (props: { line: number; position: number }) =>
      `Line ${props.line} moved to position ${props.position}`,
    // Accessible name for a cell editor: column, then line.
    cellLabel: (props: { column: string; line: number }) => `${props.column}, line ${props.line}`,

    // Select cell
    noMatches: "No matches.",
  },
  ja: {
    fullscreenLabel: "明細",

    searchPlaceholder: "明細を検索",
    searchLabel: "明細を検索",

    enterFullscreen: "全画面で表示",
    exitFullscreen: "全画面を終了",

    saveChanges: "変更を保存",
    save: "保存",
    discard: "破棄",
    unsavedChanges: (props: { count: number }) => `未保存の変更 ${props.count} 件`,
    unsavedNavBlocked: "未保存の変更があります。移動する前に保存または破棄してください。",

    emptyMessage: "明細はまだありません。",
    selectAllLines: "すべての明細を選択",
    selectLine: (props: { line: number }) => `${props.line} 行目を選択`,
    reorderLine: (props: { line: number }) => `${props.line} 行目をドラッグして並べ替え`,
    lineMoved: (props: { line: number; position: number }) =>
      `${props.line} 行目を ${props.position} 番目に移動しました`,
    cellLabel: (props: { column: string; line: number }) => `${props.column}、${props.line} 行目`,

    noMatches: "一致する項目がありません。",
  },
});

export const useLineItemsT = lineItemsLabels.useT;
