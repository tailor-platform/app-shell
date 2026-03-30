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
  },
});

export const useDataTableT = dataTableLabels.useT;
