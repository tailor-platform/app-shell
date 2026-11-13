import {
  ActionPanel,
  type ActionPanelProps,
  Text,
  useRegisterCommandPaletteActions,
} from "@tailor-platform/app-shell";
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

export function ExplicitCommandPaletteRegistration() {
  const actions: ActionPanelProps["actions"] = [
    {
      key: "create-invoice",
      label: "Create new sales invoice",
      icon: <Receipt />,
      onClick: () => {},
    },
  ];

  useRegisterCommandPaletteActions(
    "Order Actions",
    actions.flatMap((action) =>
      !action.disabled && !action.loading && action.onClick
        ? [{ key: action.key, label: action.label, icon: action.icon, onSelect: action.onClick }]
        : [],
    ),
  );

  return <ActionPanel title="Order Actions" actions={actions} />;
}

export function CustomEmptyContent() {
  return (
    <ActionPanel
      title="操作"
      actions={[]}
      emptyContent={
        <div>
          <Text.p className="text-muted-foreground">利用可能な操作はありません</Text.p>
          <Text.p className="text-muted-foreground">
            ステータスが変わると、操作が表示されます。
          </Text.p>
        </div>
      }
    />
  );
}
