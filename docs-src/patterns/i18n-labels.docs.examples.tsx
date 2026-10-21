import { Badge, Button, Layout, defineI18nLabels } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  en: {
    "requests.list.title": "Requests",
    "requests.actions.approve": "Approve",
    "requests.status.PENDING": "Pending approval",
    "requests.status.APPROVED": "Approved",
    "requests.status.unknown": "Unknown status",
  },
  ja: {
    "requests.list.title": "申請一覧",
    "requests.actions.approve": "承認",
    "requests.status.PENDING": "承認待ち",
    "requests.status.APPROVED": "承認済み",
    "requests.status.unknown": "不明な状態",
  },
});

const useRequestT = labels.useT;

export function LocalizedRequest() {
  const t = useRequestT();
  const request = { id: "REQ-1042", status: "PENDING" };
  const canApprove = request.status === "PENDING";

  return (
    <Layout>
      <Layout.Header
        title={t("requests.list.title")}
        actions={[
          <Button key="approve" disabled={!canApprove}>
            {t("requests.actions.approve")}
          </Button>,
        ]}
      />
      <Layout.Column>
        <div className="flex items-center gap-2">
          <span>{request.id}</span>
          <Badge variant={canApprove ? "warning" : "success"}>
            {t.dynamic(`requests.status.${request.status}`, t("requests.status.unknown"))}
          </Badge>
        </div>
      </Layout.Column>
    </Layout>
  );
}
