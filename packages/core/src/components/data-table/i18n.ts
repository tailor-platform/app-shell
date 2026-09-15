import { defineI18nLabels } from "@/hooks/i18n";

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

    // Column settings (DataTable.Toolbar columnSettings)
    columns: "Columns",
    columnSettings: "Column settings",
    copyColumnLabel: "Copy label",
    copyCellValue: "Copy value",
    copyCellHeaderValue: "Copy header and value",
    pinColumn: "Pin column",
    pinColumnLeft: "Pin to left",
    pinColumnRight: "Pin to right",
    unpinColumn: "Unpin",
    sortColumn: "Sort column",
    sortColumnAsc: "Ascending",
    sortColumnDesc: "Descending",
    sortColumnReset: "Reset sort",
    showAllColumns: "Show all",
    hideAllColumns: "Hide all",
    dragToReorder: "Drag to reorder",
    sectionPinnedLeft: "Fixed left",
    sectionScrollable: "Scrollable",
    sectionPinnedRight: "Fixed right",
    dropColumnsHere: "Drag columns here",
    showColumn: "Show column",
    hideColumn: "Hide column",
    searchColumns: "Search columns",
    noColumnsMatch: "No columns match",
    searchFields: "Search fields",
    noFieldsMatch: "No fields match",

    // Row selection
    selectAll: "Select all rows",
    selectRow: "Select row",

    // Row expansion. `label` is a bare record identity from
    // `rowExpansion.getLabel` (e.g. "INV-1001"); each locale owns the word
    // order, and the unnamed fallback, so the accessible name reads naturally.
    expandColumnHeader: "Expand",
    expandRow: (props: { label?: string }) =>
      props.label ? `Expand row ${props.label}` : "Expand row",
    collapseRow: (props: { label?: string }) =>
      props.label ? `Collapse row ${props.label}` : "Collapse row",
    expandedDetails: (props: { label?: string }) =>
      props.label ? `${props.label} details` : "Row details",

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
    // Multi-select enum chip summary, e.g. "2 Status(s)". Uses a simple "(s)"
    // suffix rather than owning English pluralization rules.
    filterEnumCount: (props: { count: number; noun: string }) => `${props.count} ${props.noun}(s)`,
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

    // Column settings
    columns: "列",
    columnSettings: "列の設定",
    copyColumnLabel: "ラベルをコピー",
    copyCellValue: "値をコピー",
    copyCellHeaderValue: "ヘッダと値をコピー",
    pinColumn: "列を固定",
    pinColumnLeft: "左に固定",
    pinColumnRight: "右に固定",
    unpinColumn: "固定を解除",
    sortColumn: "列をソート",
    sortColumnAsc: "昇順",
    sortColumnDesc: "降順",
    sortColumnReset: "ソートをリセット",
    showAllColumns: "すべて表示",
    hideAllColumns: "すべて非表示",
    dragToReorder: "ドラッグして並び替え",
    sectionPinnedLeft: "左に固定",
    sectionScrollable: "スクロール",
    sectionPinnedRight: "右に固定",
    dropColumnsHere: "ここに列をドラッグ",
    showColumn: "列を表示",
    hideColumn: "列を非表示",
    searchColumns: "列を検索",
    noColumnsMatch: "一致する列がありません",
    searchFields: "フィールドを検索",
    noFieldsMatch: "一致するフィールドがありません",

    selectAll: "全行を選択",
    selectRow: "行を選択",

    // Row expansion
    expandColumnHeader: "展開",
    expandRow: (props: { label?: string }) =>
      props.label ? `${props.label}の行を展開` : "行を展開",
    collapseRow: (props: { label?: string }) =>
      props.label ? `${props.label}の行を折りたたむ` : "行を折りたたむ",
    expandedDetails: (props: { label?: string }) =>
      props.label ? `${props.label}の詳細` : "行の詳細",

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
    addFilter: "フィルタに追加",
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
    filterOperator_in: "含む",
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
