import { defineI18nLabels } from "@/hooks/i18n";

/**
 * Built-in aria-label strings for the calendar grid chrome (month nav) and the
 * range-selection prompts announced from the focused cell.
 */
export const calendarLabels = defineI18nLabels({
  en: {
    previousMonth: "Previous month",
    nextMonth: "Next month",
    startRangePrompt: "Click to start selecting a date range",
    finishRangePrompt: "Click to finish selecting the date range",
  },
  ja: {
    previousMonth: "前の月",
    nextMonth: "次の月",
    startRangePrompt: "クリックして期間の選択を開始",
    finishRangePrompt: "クリックして期間の選択を確定",
  },
});

export const useCalendarT = calendarLabels.useT;
