import { defineResource, ActionPanel, useNavigate } from "@tailor-platform/app-shell";
import type { SVGProps } from "react";

export const ReceiptIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17.5v-11" />
  </svg>
);

export const FileTextIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

export const ExternalLinkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const ActionPanelDemoPage = () => {
  const navigate = useNavigate();
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
            icon: <ReceiptIcon />,
            onClick: () => alert("Create invoice clicked"),
          },
          {
            key: "delivery-note",
            label: "Create new delivery note",
            icon: <FileTextIcon />,
            onClick: () => alert("Create delivery note clicked"),
          },
          {
            key: "view-po-demo",
            label: "View Purchase Order Demo",
            icon: <ExternalLinkIcon />,
            onClick: () => navigate("/custom-page/purchase-order-demo"),
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
