import { defineResource, ActionPanel, useNavigate, useToast } from "@tailor-platform/app-shell";
import {
  Receipt as ReceiptIcon,
  FileText as FileTextIcon,
  ExternalLink as ExternalLinkIcon,
  Trash2 as Trash2Icon,
} from "lucide-react";

const ActionPanelDemoPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
        width: "100%",
        maxWidth: "480px",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Action Panel Demo</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
        This panel fills the width of its container. All actions use <code>onClick</code>; for
        navigation use <code>useNavigate()</code> inside the callback.
      </p>
      <ActionPanel
        title="Actions"
        actions={[
          {
            key: "create-invoice",
            label: "Create new sales invoice",
            icon: <ReceiptIcon size={16} />,
            onClick: () => {
              toast("Create invoice clicked");
            },
          },
          {
            key: "delivery-note",
            label: "Create new delivery note",
            icon: <FileTextIcon size={16} />,
            onClick: () => {
              toast("Create delivery note clicked");
            },
          },
          {
            key: "view-po-demo",
            label: "View Purchase Order Demo",
            icon: <ExternalLinkIcon size={16} />,
            onClick: () => navigate("/custom-page/purchase-order-demo"),
          },
          {
            key: "delete-result",
            label: "Delete Result",
            icon: <Trash2Icon size={16} />,
            variant: "destructive",
            onClick: () => {
              toast("Delete result clicked");
            },
          },
        ]}
      />
    </div>
  );
};

export const actionPanelDemoResource = defineResource({
  path: "action-panel-demo",
  meta: { title: "Action Panel Demo" },
  component: ActionPanelDemoPage,
});
