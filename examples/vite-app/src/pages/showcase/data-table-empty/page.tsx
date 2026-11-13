import { useState, type ReactNode } from "react";
import {
  DataTable,
  Layout,
  Tabs,
  Text,
  Toolbar,
  useDataTable,
  type AppShellPageProps,
  type Column,
} from "@tailor-platform/app-shell";
import { Table2 } from "lucide-react";

type Request = { id: string; title: string; status: string };

const columns: Column<Request>[] = [
  { id: "title", label: "Request", type: "text" },
  { id: "status", label: "Status", type: "text" },
];

const wideColumns: Column<Request>[] = [
  ...columns,
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `extra-${index}`,
    label: `Additional column ${index + 1}`,
    width: 200,
    render: () => "Additional value",
  })),
];

function StatusTable({
  className,
  emptyContent,
  errorContent,
  wide,
  state = "empty",
}: {
  className?: string;
  emptyContent?: ReactNode;
  errorContent?: ReactNode;
  wide: boolean;
  state?: string;
}) {
  const table = useDataTable({
    columns: wide ? wideColumns : columns,
    data: { rows: [] },
    loading: state === "loading",
    error: state === "error" ? new Error("Unable to load requests") : null,
    rowSelection: {},
    rowExpansion: { render: (row) => <Text.p>{row.title}</Text.p> },
    rowActions: [{ id: "view", label: "View", onClick: (row) => window.alert(row.title) }],
  });

  return (
    <DataTable.Root value={table} className={className}>
      <Toolbar.Root>
        <Toolbar.Row justify="between" aria-label="Request table controls">
          <Toolbar.Group>
            <Text.span>Requests</Text.span>
          </Toolbar.Group>
          <Toolbar.Group>
            <DataTable.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <DataTable.Table emptyContent={emptyContent} errorContent={errorContent} />
      <DataTable.Footer>
        <Text.span variant="body-sm" className="text-muted-foreground">
          Selection, expansion, and row actions are enabled. Try hiding a column.
        </Text.span>
      </DataTable.Footer>
    </DataTable.Root>
  );
}

const DataTableEmptyPage = () => {
  const [state, setState] = useState("empty");
  const [variant, setVariant] = useState("natural");
  const [columnLayout, setColumnLayout] = useState("normal");
  let tableClassName: string | undefined;
  let emptyContent: ReactNode;
  let errorContent: ReactNode;
  if (variant === "fixed") {
    tableClassName = "h-96";
    emptyContent = "承認待ちの申請はありません";
    errorContent = "申請を取得できませんでした";
  } else if (variant === "flex") {
    tableClassName = "flex-1";
    emptyContent = (
      <div className="space-y-2 whitespace-normal">
        <Text.p>承認待ちの申請はありません</Text.p>
        <Text.p variant="body-sm" className="text-muted-foreground">
          New requests will appear here when they are ready for approval.
        </Text.p>
      </div>
    );
    errorContent = (
      <div className="space-y-2 whitespace-normal">
        <Text.p className="text-danger-text">申請を取得できませんでした</Text.p>
        <Text.p variant="body-sm" className="text-muted-foreground">
          Please try again later. Contact support if the problem persists.
        </Text.p>
      </div>
    );
  }

  return (
    <Layout>
      <Layout.Header title="DataTable empty & error states" />
      <Layout.Column>
        <div className="space-y-8">
          <Text.p>
            Switch between natural height, an explicit table height, and a table filling a bounded
            flex parent. Empty and error content should stay centered in the available body area,
            above the footer. Choose many columns to check that the message stays visible before and
            after horizontal scrolling.
          </Text.p>
          <div className="space-y-3">
            <Tabs.Root value={variant} onValueChange={setVariant}>
              <Tabs.List aria-label="Table variation">
                <Tabs.Tab value="natural">Natural height — default message</Tabs.Tab>
                <Tabs.Tab value="fixed">Explicit height — custom message</Tabs.Tab>
                <Tabs.Tab value="flex">Bounded flex parent — custom markup</Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
            <Tabs.Root value={state} onValueChange={setState}>
              <Tabs.List aria-label="Table state">
                <Tabs.Tab value="empty">Empty</Tabs.Tab>
                <Tabs.Tab value="loading">Loading</Tabs.Tab>
                <Tabs.Tab value="error">Error</Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
            <Tabs.Root value={columnLayout} onValueChange={setColumnLayout}>
              <Tabs.List aria-label="Column count">
                <Tabs.Tab value="normal">Few columns</Tabs.Tab>
                <Tabs.Tab value="wide">Many columns</Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
          </div>
          <div className={variant === "flex" ? "flex h-96 flex-col" : undefined}>
            <StatusTable
              className={tableClassName}
              state={state}
              emptyContent={emptyContent}
              errorContent={errorContent}
              wide={columnLayout === "wide"}
            />
          </div>
        </div>
      </Layout.Column>
    </Layout>
  );
};

DataTableEmptyPage.appShellPageProps = {
  meta: { title: "DataTable empty & error states", icon: <Table2 size={16} /> },
} satisfies AppShellPageProps;

export default DataTableEmptyPage;
