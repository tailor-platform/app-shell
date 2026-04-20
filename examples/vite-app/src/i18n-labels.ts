import { defineI18nLabels } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    pageTitle: "Welcome to App Shell",
    pageDescription: "This is the root page.",
    greeting: (args: { name: string }) => `Hello, ${args.name}!`,
    navMain: "Main",
    navSettings: "Configuration",
    ordersTitle: "Orders",
    dashboardTitle: "Dashboard",
  },
  ja: {
    pageTitle: "App Shellへようこそ",
    pageDescription: "これはルートページです。",
    greeting: (args: { name: string }) => `こんにちは、${args.name}さん！`,
    navMain: "メイン",
    navSettings: "設定",
    ordersTitle: "注文一覧",
    dashboardTitle: "ダッシュボード",
  },
});

export const useT = labels.useT;
