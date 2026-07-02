import { defineI18nLabels } from "@/hooks/i18n";

/** Built-in aria-label strings for the date-field chrome (popover trigger + dialog). */
export const dateFieldLabels = defineI18nLabels({
  en: {
    openCalendar: "Open calendar",
    chooseDate: "Choose date",
    chooseDateFor: (p: { name: string }) => `${p.name}, choose date`,
    calendar: "Calendar",
  },
  ja: {
    openCalendar: "カレンダーを開く",
    chooseDate: "日付を選択",
    chooseDateFor: (p: { name: string }) => `${p.name}、日付を選択`,
    calendar: "カレンダー",
  },
});

export const useDateFieldT = dateFieldLabels.useT;
