import { defineI18nLabels } from "@/hooks/i18n";

/** English plural of a column label for enum count summaries ("Status" → "statuses"). */
function pluralizeEn(label: string): string {
  const w = label.toLowerCase();
  if (/(s|x|z|ch|sh)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

export const dataTableLabels = defineI18nLabels({
  en: {
    // DataTable.Body
    loading: "Loading...",
    noData: "No data",
    errorPrefix: "Error:",

    // DataTable.Headers (sr-only for actions column)
    actionsHeader: "Actions",

    // RowActionsMenu aria-label
    rowActions: "Row actions",

    // Row selection
    selectAll: "Select all rows",
    selectRow: "Select row",

    // Pagination
    paginationFirst: "First page",
    paginationPrevious: "Previous page",
    paginationNext: "Next page",
    paginationLast: "Last page",
    paginationRowsPerPage: "Rows per page",
    paginationPage: "Page",
    paginationTotalRows: (props: { total: number }) => `${props.total} row(s)`,
    paginationSelectedOfTotal: (props: { selected: number; total: number }) =>
      `${props.selected} of ${props.total} row(s) selected`,
    paginationSelectedRows: (props: { selected: number }) => `${props.selected} row(s) selected`,

    // Filters
    addFilter: "Add filter",
    applyFilter: "Apply",
    updateFilter: "Update",
    removeFilter: "Remove filter",
    clearFilter: "Clear this filter",
    clearAllFilters: "Clear all filters",
    chooseTime: "Choose time",
    filterOperatorSearchPlaceholder: "Search...",
    filterOperatorNoResults: "No results",
    filterValuePlaceholder: (props: { field: string }) => `Enter ${props.field.toLowerCase()}`,
    // Multi-select enum chip summary, e.g. "2 statuses".
    filterEnumCount: (props: { count: number; noun: string }) =>
      `${props.count} ${pluralizeEn(props.noun)}`,
    filterBooleanTrue: "True",
    filterBooleanFalse: "False",
    filterOperator_eq: "is",
    filterOperator_ne: "is not",
    filterOperator_gt: "greater than",
    filterOperator_gte: "greater than or equal",
    filterOperator_lt: "less than",
    filterOperator_lte: "less than or equal",
    filterOperator_contains: "contains",
    filterOperator_notContains: "does not contain",
    filterOperator_hasPrefix: "starts with",
    filterOperator_hasSuffix: "ends with",
    filterOperator_notHasPrefix: "does not start with",
    filterOperator_notHasSuffix: "does not end with",
    filterOperator_between: "is between",
    filterOperator_in: "is any of",
    filterOperator_nin: "is none of",
    // Date-specific operator labels (date filters drop gt/lt/ne and treat the
    // boundary as inclusive).
    filterDateOperator_eq: "exact date",
    filterDateOperator_gte: "after",
    filterDateOperator_lte: "before",
    filterBetweenFrom: "From",
    filterBetweenTo: "To",
    filterBetweenMin: "Min",
    filterBetweenMax: "Max",
    filterBetweenOrderError: (props: { min: string; max: string }) =>
      `${props.max} must be greater than or equal to ${props.min}`,
    filterCaseSensitive: "Case sensitive",

    // Filter chip label templates
    filterChipLabel: (props: { column: string; operator: string; value: string }) =>
      `${props.column} ${props.operator} ${props.value}`,
    filterChipLabelEnum: (props: { column: string; operator: string; value: string }) =>
      `${props.column} ${props.operator}: ${props.value}`,
  },
  ja: {
    loading: "読み込み中...",
    noData: "データがありません",
    errorPrefix: "エラー:",
    actionsHeader: "操作",
    rowActions: "行の操作",
    selectAll: "全行を選択",
    selectRow: "行を選択",
    paginationFirst: "最初のページ",
    paginationPrevious: "前のページ",
    paginationNext: "次のページ",
    paginationLast: "最後のページ",
    paginationRowsPerPage: "表示件数",
    paginationPage: "ページ",
    paginationTotalRows: (props: { total: number }) => `${props.total} 行`,
    paginationSelectedOfTotal: (props: { selected: number; total: number }) =>
      `${props.total} 行中 ${props.selected} 行を選択中`,
    paginationSelectedRows: (props: { selected: number }) => `${props.selected} 行を選択中`,

    // Filters
    addFilter: "フィルタを追加",
    applyFilter: "適用",
    updateFilter: "更新",
    removeFilter: "フィルタを削除",
    clearFilter: "このフィルタをクリア",
    clearAllFilters: "すべてのフィルタをクリア",
    chooseTime: "時刻を選択",
    filterOperatorSearchPlaceholder: "検索...",
    filterOperatorNoResults: "該当なし",
    filterValuePlaceholder: (props: { field: string }) => `${props.field}を入力`,
    // Multi-select enum chip summary, e.g. "ステータス2件".
    filterEnumCount: (props: { count: number; noun: string }) => `${props.noun}${props.count}件`,
    filterBooleanTrue: "真",
    filterBooleanFalse: "偽",
    filterOperator_eq: "と等しい",
    filterOperator_ne: "と等しくない",
    filterOperator_gt: "より大きい",
    filterOperator_gte: "以上",
    filterOperator_lt: "より小さい",
    filterOperator_lte: "以下",
    filterOperator_contains: "を含む",
    filterOperator_notContains: "を含まない",
    filterOperator_hasPrefix: "で始まる",
    filterOperator_hasSuffix: "で終わる",
    filterOperator_notHasPrefix: "で始まらない",
    filterOperator_notHasSuffix: "で終わらない",
    filterOperator_between: "の範囲内",
    filterOperator_in: "次のいずれか",
    filterOperator_nin: "次のいずれでもない",
    filterDateOperator_eq: "指定日",
    filterDateOperator_gte: "以降",
    filterDateOperator_lte: "以前",
    filterBetweenFrom: "開始",
    filterBetweenTo: "終了",
    filterBetweenMin: "最小",
    filterBetweenMax: "最大",
    filterBetweenOrderError: (props: { min: string; max: string }) =>
      `${props.max}は${props.min}以上にしてください`,
    filterCaseSensitive: "大文字小文字を区別する",

    // Filter chip label templates (Japanese: column: value operator)
    filterChipLabel: (props: { column: string; operator: string; value: string }) =>
      `${props.column}: ${props.value} ${props.operator}`,
    filterChipLabelEnum: (props: { column: string; operator: string; value: string }) =>
      `${props.column} ${props.operator}: ${props.value}`,
  },
});

export const useDataTableT = dataTableLabels.useT;
