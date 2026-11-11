import { defineI18nLabels } from "@/hooks/i18n";

export const editableCardLabels = defineI18nLabels({
  en: {
    edit: "Edit",
    cancel: "Cancel",
    save: "Save",
    readOnlyDefault: "This value can't be edited here.",
  },
  ja: {
    edit: "編集",
    cancel: "キャンセル",
    save: "保存",
    readOnlyDefault: "この項目はここでは編集できません。",
  },
});

export const useEditableCardT = editableCardLabels.useT;
