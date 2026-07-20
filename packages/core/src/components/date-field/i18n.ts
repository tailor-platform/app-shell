import { defineI18nLabels } from "@/hooks/i18n";

/**
 * Built-in strings for the date-field chrome — popover trigger + dialog, the
 * per-segment accessible names, and the empty-segment announcement. en values
 * match what screen readers previously read verbatim, so behaviour is unchanged
 * for English (and tests) while other locales resolve from the AppShell locale.
 */
export const dateFieldLabels = defineI18nLabels({
  en: {
    openCalendar: "Open calendar",
    chooseDate: "Choose date",
    chooseDateFor: (p: { name: string }) => `${p.name}, choose date`,
    calendar: "Calendar",
    empty: "Empty",
    // Default validation messages (shown when the consumer passes no
    // `errorMessage`): a typed/shortcut date outside min/max, or unavailable.
    dateOutOfRange: "Date is outside the allowed range.",
    dateUnavailable: "This date is unavailable.",
    // Per-segment accessible names (keys match the segment `type`).
    year: "year",
    month: "month",
    day: "day",
    hour: "hour",
    minute: "minute",
    second: "second",
    dayPeriod: "AM/PM",
  },
  ja: {
    openCalendar: "カレンダーを開く",
    chooseDate: "日付を選択",
    chooseDateFor: (p: { name: string }) => `${p.name}、日付を選択`,
    calendar: "カレンダー",
    empty: "未入力",
    dateOutOfRange: "指定できる範囲外の日付です。",
    dateUnavailable: "この日付は選択できません。",
    year: "年",
    month: "月",
    day: "日",
    hour: "時",
    minute: "分",
    second: "秒",
    dayPeriod: "午前/午後",
  },
});

export const useDateFieldT = dateFieldLabels.useT;
