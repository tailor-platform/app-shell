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
    optionWithCount: (props: { label: string; count: string }) =>
      `${props.label}, ${props.count} items`,
    itemCount: (props: { count: string }) => `${props.count} items`,
    rangeMin: "Min",
    rangeMax: "Max",
    rangeTo: "to",
    rangeMinLabel: (props: { section: string }) => `Minimum ${props.section}`,
    rangeMaxLabel: (props: { section: string }) => `Maximum ${props.section}`,

    // Empty-result recovery
    nothingMatches: "Nothing matches these filters.",
    clearToSee: (props: { section: string; count: string }) =>
      `Clear ${props.section} to see ${props.count}`,

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
    sortBaselineCount: "By count",
    resetLayout: "Reset to default",

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
    optionWithCount: (props: { label: string; count: string }) =>
      `${props.label}、${props.count}件`,
    itemCount: (props: { count: string }) => `${props.count}件`,
    rangeMin: "最小",
    rangeMax: "最大",
    rangeTo: "〜",
    rangeMinLabel: (props: { section: string }) => `${props.section}の最小値`,
    rangeMaxLabel: (props: { section: string }) => `${props.section}の最大値`,

    nothingMatches: "条件に一致する項目がありません。",
    clearToSee: (props: { section: string; count: string }) =>
      `${props.section}をクリアすると${props.count}件表示`,

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
    sortBaselineCount: "件数順",
    resetLayout: "既定に戻す",

    activeCount: (props: { label: string; count: number }) =>
      `${props.label}、${props.count}件適用中`,
    sheetDescription: "結果を絞り込みます。",
  },
});

export const useFilterRailT = filterRailLabels.useT;
