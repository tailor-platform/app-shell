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

    // Pagination
    paginationFirst: "First page",
    paginationPrevious: "Previous page",
    paginationNext: "Next page",
    paginationLast: "Last page",
    paginationRowsPerPage: "Rows per page",
    paginationPage: "Page",

    // Filters
    addFilter: "Add filter",
    applyFilter: "Apply",
    removeFilter: "Remove filter",
    filterBooleanTrue: "True",
    filterBooleanFalse: "False",
    filterOperator_eq: "equals",
    filterOperator_ne: "not equals",
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
    filterOperator_between: "between",
    filterOperator_in: "in",
    filterOperator_nin: "not in",

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
    paginationFirst: "最初のページ",
    paginationPrevious: "前のページ",
    paginationNext: "次のページ",
    paginationLast: "最後のページ",
    paginationRowsPerPage: "表示件数",
    paginationPage: "ページ",

    // Filters
    addFilter: "フィルタを追加",
    applyFilter: "適用",
    removeFilter: "フィルタを削除",
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

    // Filter chip label templates (Japanese: column: value operator)
    filterChipLabel: (props: { column: string; operator: string; value: string }) =>
      `${props.column}: ${props.value} ${props.operator}`,
    filterChipLabelEnum: (props: { column: string; operator: string; value: string }) =>
      `${props.column} ${props.operator}: ${props.value}`,
  },
});

export const useDataTableT = dataTableLabels.useT;
