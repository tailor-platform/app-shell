import { defineI18nLabels } from "@/hooks/i18n";

/** Built-in aria-label strings for the calendar grid chrome (month nav). */
export const calendarLabels = defineI18nLabels({
  en: {
    previousMonth: "Previous month",
    nextMonth: "Next month",
  },
  ja: {
    previousMonth: "前の月",
    nextMonth: "次の月",
  },
});

export const useCalendarT = calendarLabels.useT;
