import { defineI18nLabels } from "@/hooks/i18n";

export const csvExporterLabels = defineI18nLabels({
  en: {
    noRows: "No data to export",
    exportComplete: (props: { count: number }) => `${props.count.toLocaleString()} rows exported`,
    exportFailed: "Failed to export CSV",
    exportCancelled: "CSV export cancelled",
    dialogTitle: "Download CSV",
    filename: "File name",
    download: "Download",
    csvExport: "CSV Export",
    exporting: "Exporting CSV",
    fetchingRows: (props: { completed: number; total: number | null }) =>
      props.total == null
        ? `${props.completed.toLocaleString()} rows fetched`
        : `${props.completed.toLocaleString()} / ${props.total.toLocaleString()} rows fetched`,
    creatingFile: "Creating CSV file…",
    cancel: "Cancel",
    retry: "Retry",
    invalidFilename: "Enter a file name",
  },
  ja: {
    noRows: "エクスポートするデータがありません",
    exportComplete: (props: { count: number }) =>
      `${props.count.toLocaleString()} 行をエクスポートしました`,
    exportFailed: "CSV のエクスポートに失敗しました",
    exportCancelled: "CSV のエクスポートをキャンセルしました",
    dialogTitle: "CSV をダウンロード",
    filename: "ファイル名",
    download: "ダウンロード",
    csvExport: "CSVエクスポート",
    exporting: "CSV をエクスポート中",
    fetchingRows: (props: { completed: number; total: number | null }) =>
      props.total == null
        ? `${props.completed.toLocaleString()} 行を取得済み`
        : `${props.completed.toLocaleString()} / ${props.total.toLocaleString()} 行を取得中`,
    creatingFile: "CSV ファイルを作成中…",
    cancel: "キャンセル",
    retry: "再試行",
    invalidFilename: "ファイル名を入力してください",
  },
});

export const useCsvExporterT = csvExporterLabels.useT;
