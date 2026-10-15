import { defineI18nLabels } from "@/hooks/i18n";

export const filterRailLabels = defineI18nLabels({
  en: {
    title: "Filters",
    clear: "Clear",
    clearAll: "Clear all",
    any: "Any",
    yes: "Yes",
    no: "No",
    showMore: (props: { count: number }) => `Show ${props.count} more`,
    showLess: "Show less",
    searchOptions: "Filter…",
    searchOptionsLabel: (props: { section: string }) => `Filter ${props.section} options`,
    noMatchingValues: "No matching values",
    sectionActive: (props: { count: number }) => `${props.count} selected`,
    rangeMin: "Min",
    rangeMax: "Max",
    rangeTo: "to",
    rangeMinLabel: (props: { section: string }) => `Minimum ${props.section}`,
    rangeMaxLabel: (props: { section: string }) => `Maximum ${props.section}`,

    // Settings
    settings: "Filter settings",
    settingsDescription: "Show, reorder and sort the filter sections.",
    showSection: (props: { section: string }) => `Show ${props.section}`,
    hideSection: (props: { section: string }) => `Hide ${props.section}`,
    hideSectionClears: (props: { section: string }) =>
      `Hide ${props.section}, which also clears its filter`,
    hideSectionClearsHint: "Filtering now — hiding this section also clears its filter",
    reorderSection: (props: { section: string }) =>
      `Reorder ${props.section}. Use arrow up and down.`,
    sortOptions: (props: { section: string }) => `Sort ${props.section} options`,
    sortGiven: "Default",
    sortLabel: "A–Z",
    resetLayout: "Reset to default",

    // Saved filters
    savedFilters: "Saved filters",
    savedFiltersLoading: "Loading…",
    noSavedFilters: "No saved filters yet",
    noFilter: "No filter",
    deleteSaved: (props: { name: string }) => `Delete ${props.name}`,
    deleteSavedTitle: (props: { name: string }) => `Delete saved filter "${props.name}"?`,
    deleteSavedDescription:
      "It will be removed from your saved filters. The filters applied now are not changed.",
    delete: "Delete",
    savedFiltersError: "Couldn't load or save your saved filters.",
    saveFilter: "Save filters",
    saveFilterDescription: "Saves the filters selected here under a name.",
    saveFilterName: "Name",
    saveFilterPlaceholder: "e.g. Low-stock electronics",
    replacesExisting: (props: { name: string }) => `Replaces the existing "${props.name}".`,
    cancel: "Cancel",
    save: "Save",
    replace: "Replace",

    // Compact layout
    activeCount: (props: { label: string; count: number }) =>
      `${props.label}, ${props.count} active`,
    sheetDescription: "Filter the results.",
  },
  ja: {
    title: "フィルター",
    clear: "クリア",
    clearAll: "すべてクリア",
    any: "すべて",
    yes: "はい",
    no: "いいえ",
    showMore: (props: { count: number }) => `さらに${props.count}件を表示`,
    showLess: "表示を減らす",
    searchOptions: "絞り込み…",
    searchOptionsLabel: (props: { section: string }) => `${props.section}の選択肢を絞り込み`,
    noMatchingValues: "一致する値がありません",
    sectionActive: (props: { count: number }) => `${props.count}件選択中`,
    rangeMin: "最小",
    rangeMax: "最大",
    rangeTo: "〜",
    rangeMinLabel: (props: { section: string }) => `${props.section}の最小値`,
    rangeMaxLabel: (props: { section: string }) => `${props.section}の最大値`,

    settings: "フィルター設定",
    settingsDescription: "フィルターセクションの表示・並び順・並べ替えを設定します。",
    showSection: (props: { section: string }) => `${props.section}を表示`,
    hideSection: (props: { section: string }) => `${props.section}を非表示`,
    hideSectionClears: (props: { section: string }) =>
      `${props.section}を非表示にし、そのフィルターもクリア`,
    hideSectionClearsHint: "フィルター適用中 — 非表示にするとこのフィルターもクリアされます",
    reorderSection: (props: { section: string }) =>
      `${props.section}の並び順を変更。上下矢印キーで移動します。`,
    sortOptions: (props: { section: string }) => `${props.section}の選択肢の並べ替え`,
    sortGiven: "既定",
    sortLabel: "名前順",
    resetLayout: "既定に戻す",

    savedFilters: "保存したフィルター",
    savedFiltersLoading: "読み込み中…",
    noSavedFilters: "保存したフィルターはまだありません",
    noFilter: "フィルターなし",
    deleteSaved: (props: { name: string }) => `${props.name}を削除`,
    deleteSavedTitle: (props: { name: string }) =>
      `保存したフィルター「${props.name}」を削除しますか？`,
    deleteSavedDescription:
      "保存したフィルターから削除されます。現在適用中のフィルターは変わりません。",
    delete: "削除",
    savedFiltersError: "保存したフィルターを読み込めない、または保存できませんでした。",
    saveFilter: "フィルターを保存",
    saveFilterDescription: "ここで選択しているフィルターに名前を付けて保存します。",
    saveFilterName: "名前",
    saveFilterPlaceholder: "例: 在庫僅少の電子機器",
    replacesExisting: (props: { name: string }) => `既存の「${props.name}」を置き換えます。`,
    cancel: "キャンセル",
    save: "保存",
    replace: "置き換える",

    activeCount: (props: { label: string; count: number }) =>
      `${props.label}、${props.count}件適用中`,
    sheetDescription: "結果を絞り込みます。",
  },
});

export const useFilterRailT = filterRailLabels.useT;
