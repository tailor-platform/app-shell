import { defineI18nLabels } from "@/hooks/i18n";

export const stepperLabels = defineI18nLabels({
  en: {
    label: "Progress",
    complete: "Completed",
    skipped: "Skipped",
    upcoming: "Not started",
    stepOf: (props: { current: number; total: number }) =>
      `Step ${props.current} of ${props.total}`,
  },
  ja: {
    label: "進捗",
    complete: "完了",
    skipped: "対象外",
    upcoming: "未着手",
    stepOf: (props: { current: number; total: number }) =>
      `ステップ ${props.current} / ${props.total}`,
  },
});

export const useStepperT = stepperLabels.useT;
