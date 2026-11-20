import { useEffect, useState } from "react";
import {
  ActionPanel,
  type ActionPanelProps,
  Text,
  useRegisterCommandPaletteActions,
} from "@tailor-platform/app-shell";
import { Check, ExternalLink, Receipt, Trash2 } from "lucide-react";

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

export function Confirmation() {
  const [deleted, setDeleted] = useState(false);
  const [shouldFail, setShouldFail] = useState(true);

  return (
    <ActionPanel
      title="Order Actions"
      emptyContent="Order deleted"
      actions={
        deleted
          ? []
          : [
              {
                key: "delete-order",
                label: "Delete order",
                icon: <Trash2 />,
                variant: "destructive",
                confirmation: {
                  title: "Delete order ORD-1024?",
                  description:
                    "This removes the order and all its line items. This cannot be undone.",
                  cancelLabel: "Keep order",
                  busyLabel: "Deleting…",
                },
                onClick: async () => {
                  // Simulate a rejected request once so the example also demonstrates retry.
                  if (shouldFail) {
                    setShouldFail(false);
                    throw new Error("The order could not be deleted. Please try again.");
                  }
                  setDeleted(true);
                },
              },
            ]
      }
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
      !action.disabled && !action.loading && !action.confirmation && action.onClick
        ? [{ key: action.key, label: action.label, icon: action.icon, onSelect: action.onClick }]
        : [],
    ),
  );

  return <ActionPanel title="Order Actions" actions={actions} />;
}

export function WithLoadingState() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (loadingKey !== "confirm") return;

    const timer = setTimeout(() => {
      setConfirmed(true);
      setLoadingKey(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [loadingKey]);

  return (
    <div className="flex flex-col gap-3">
      <ActionPanel
        title="Order actions"
        actions={[
          {
            key: "confirm",
            label: "Confirm order",
            icon: <Check />,
            onClick: () => {
              setConfirmed(false);
              setLoadingKey("confirm");
            },
            loading: loadingKey === "confirm",
          },
        ]}
      />
      <Text.p role="status">
        {loadingKey === "confirm"
          ? "Confirming order…"
          : confirmed
            ? "Order SO-1001 confirmed. You can try again."
            : "Click Confirm order to simulate a request."}
      </Text.p>
    </div>
  );
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
