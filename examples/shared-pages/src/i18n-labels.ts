import { defineI18nLabels } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    projectsTitle: "Projects",
    projectDetailTitle: "Project Detail",
    projectListDescription: "Manage your projects and track progress.",
    tasksTitle: "Tasks",
    tasksDescription: "View and manage tasks across projects.",
    componentsTitle: "Components",
    descriptionCardTitle: "Description Card",
    profileTitle: "Profile",
  },
  ja: {
    projectsTitle: "プロジェクト",
    projectDetailTitle: "プロジェクト詳細",
    projectListDescription: "プロジェクトを管理し、進捗を追跡します。",
    tasksTitle: "タスク",
    tasksDescription: "プロジェクト全体のタスクを表示・管理します。",
    componentsTitle: "コンポーネント",
    descriptionCardTitle: "説明カード",
    profileTitle: "プロフィール",
  },
});

export const useT = labels.useT;
