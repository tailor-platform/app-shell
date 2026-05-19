import { defineI18nLabels } from "@/hooks/i18n";

export const descriptionCardLabels = defineI18nLabels({
  en: {
    relativeJustNow: "Just now",
    relativeMinutesAgo: (props: { count: number }) => `${props.count} minutes ago`,
    relativeHoursAgo: (props: { count: number }) => `${props.count} hours ago`,
    relativeYesterday: "Yesterday",
    relativeDaysAgo: (props: { count: number }) => `${props.count} days ago`,
    relativeWeeksAgo: (props: { count: number }) => `${props.count} weeks ago`,
    relativeMonthsAgo: (props: { count: number }) => `${props.count} months ago`,
    relativeYearsAgo: (props: { count: number }) => `${props.count} years ago`,
    relativeInMinutes: (props: { count: number }) => `In ${props.count} minutes`,
    relativeInHours: (props: { count: number }) => `In ${props.count} hours`,
    relativeTomorrow: "Tomorrow",
    relativeInDays: (props: { count: number }) => `In ${props.count} days`,
    relativeInWeeks: (props: { count: number }) => `In ${props.count} weeks`,
    relativeInMonths: (props: { count: number }) => `In ${props.count} months`,
    relativeInYears: (props: { count: number }) => `In ${props.count} years`,
  },
  ja: {
    relativeJustNow: "たった今",
    relativeMinutesAgo: (props: { count: number }) => `${props.count}分前`,
    relativeHoursAgo: (props: { count: number }) => `${props.count}時間前`,
    relativeYesterday: "昨日",
    relativeDaysAgo: (props: { count: number }) => `${props.count}日前`,
    relativeWeeksAgo: (props: { count: number }) => `${props.count}週間前`,
    relativeMonthsAgo: (props: { count: number }) => `${props.count}ヶ月前`,
    relativeYearsAgo: (props: { count: number }) => `${props.count}年前`,
    relativeInMinutes: (props: { count: number }) => `${props.count}分後`,
    relativeInHours: (props: { count: number }) => `${props.count}時間後`,
    relativeTomorrow: "明日",
    relativeInDays: (props: { count: number }) => `${props.count}日後`,
    relativeInWeeks: (props: { count: number }) => `${props.count}週間後`,
    relativeInMonths: (props: { count: number }) => `${props.count}ヶ月後`,
    relativeInYears: (props: { count: number }) => `${props.count}年後`,
  },
});

export const useDescriptionCardT = descriptionCardLabels.useT;
