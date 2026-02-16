import { defineI18nLabels } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    goToSub1: "Go to sub1",
    "goToSub1-1": "Go to sub1-1",
    goToDynamicPage: "Go to dynamic page",
    customPageTitle: "Custom Page",
    dynamicPageTitle: "Dynamic Page",
    dynamicPageDescription: (args: { id: string }) =>
      `This is a dynamic page with ID: ${args.id}`,
    subPageTitle: "Sub Page",
    subPageDescription: "This is a sub page",
    subSubPageTitle: "Sub Sub Page",
    subSubPageDescription: "This is a sub sub page",
  },
  ja: {
    goToSub1: "サブ1へ移動",
    "goToSub1-1": "サブ1-1へ移動",
    goToDynamicPage: "動的ページへ移動",
    customPageTitle: "カスタムページ",
    dynamicPageTitle: "動的ページ",
    dynamicPageDescription: (args: { id: string }) =>
      `これはID: ${args.id}の動的ページです`,
    subPageTitle: "サブページ",
    subPageDescription: "これはサブページです",
    subSubPageTitle: "サブサブページ",
    subSubPageDescription: "これはサブサブページです",
  },
});

export const useT = labels.useT;
