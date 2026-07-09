import { ActionPanel } from "@tailor-platform/app-shell";

const dot = <span aria-hidden="true" className="size-2 rounded-full bg-current" />;

export function ActionPanelExample() {
  return (
    <ActionPanel
      title="Actions"
      actions={[
        { key: "approve", label: "Approve", icon: dot, variant: "default", onClick: () => {} },
        {
          key: "reject",
          label: "Reject",
          icon: dot,
          variant: "destructive",
          onClick: () => {},
          disabled: false,
        },
      ]}
    />
  );
}
