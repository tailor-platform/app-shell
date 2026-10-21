import { Badge, Button, Layout, defineI18nLabels, defineModule } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    title: "Requests",
    save: "Save",
    greeting: ({ name }: { name: string }) => `Hello, ${name}!`,
    itemCount: ({ count }: { count: number }) => (count === 1 ? "1 item" : `${count} items`),
    "status.PENDING": "Pending",
    unknownStatus: "Unknown status",
  },
  ja: {
    title: "申請一覧",
    save: "保存",
    greeting: ({ name }: { name: string }) => `こんにちは、${name}さん！`,
    itemCount: ({ count }: { count: number }) => `${count}件`,
    "status.PENDING": "承認待ち",
    unknownStatus: "不明な状態",
  },
});

export const useT = labels.useT;

export function InComponents() {
  const t = useT();

  return <Button>{t("save")}</Button>;
}

export function DynamicLabels() {
  const t = useT();

  return (
    <Layout>
      <Layout.Header title={t("greeting", { name: "Alex" })} />
      <Layout.Column>{t("itemCount", { count: 3 })}</Layout.Column>
    </Layout>
  );
}

export function RuntimeKeys() {
  const t = useT();
  const status: string = "PENDING";

  return <Badge variant="warning">{t.dynamic(`status.${status}`, t("unknownStatus"))}</Badge>;
}

export const requestModule = defineModule({
  path: "requests",
  meta: {
    title: labels.t("title"),
    breadcrumbTitle: labels.t("title"),
  },
  component: InComponents,
  resources: [],
});
