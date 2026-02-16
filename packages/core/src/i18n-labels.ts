import { defineI18nLabels } from "@/hooks/i18n";

export const labels = defineI18nLabels({
  en: {
    error404Title: "404 Not Found",
    error404Body: "The page you requested could not be found.",
    goBack: "Go Back",
    errorUnexpected: "An unexpected error occurred",
    errorTitle: "Something went wrong",
    tryAgain: "Try Again",
    welcomeTitle: "Welcome to AppShell",
    welcomeBody: "Add your GraphQL resources from configuration at first!",
    settings: "Settings",
    toggle: "Toggle",
    toggleSidebar: "Toggle Sidebar",
    sidebar: "Sidebar",
    sidebarDesc: "Displays the mobile sidebar.",
    close: "Close",
    more: "More",
    commandPaletteSearch: "Search pages...",
    commandPaletteNoResults: "No results found",
  },
  ja: {
    error404Title: "404 ページが見つかりません",
    error404Body: "お探しのページは存在しません。",
    goBack: "戻る",
    errorUnexpected: "予期しないエラーが発生しました",
    errorTitle: "問題が発生しました",
    tryAgain: "再試行",
    welcomeTitle: "AppShell へようこそ",
    welcomeBody: "まず設定から GraphQL リソースを追加してください。",
    settings: "設定",
    toggle: "切り替え",
    toggleSidebar: "サイドバーを切り替え",
    sidebar: "サイドバー",
    sidebarDesc: "モバイル用サイドバーを表示します。",
    close: "閉じる",
    more: "その他",
    commandPaletteSearch: "ページを検索...",
    commandPaletteNoResults: "結果が見つかりません",
  },
});

export const useT = labels.useT;
