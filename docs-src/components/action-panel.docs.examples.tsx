import { ActionPanel, Text } from "@tailor-platform/app-shell";
import { ExternalLink, Receipt } from "lucide-react";

export function BasicUsage() {
  return (
    <ActionPanel
      title="Actions"
      actions={[
        {
          key: "create-invoice",
          label: "Create new sales invoice",
          icon: <Receipt />,
          onClick: () => {},
        },
        {
          key: "view-docs",
          label: "View documentation",
          icon: <ExternalLink />,
          onClick: () => {},
        },
      ]}
    />
  );
}

export function CustomEmptyContent() {
  return (
    <ActionPanel
      title="操作"
      actions={[]}
      emptyContent={
        <div>
          <Text.p>利用可能な操作はありません</Text.p>
          <Text.p>ステータスが変わると、操作が表示されます。</Text.p>
        </div>
      }
    />
  );
}
