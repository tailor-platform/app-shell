import * as React from "react";
import {
  Button,
  Card,
  Combobox,
  Layout,
  LineItems,
  createLineItemHelper,
  defineResource,
  useLineItems,
  useLineItemsGroup,
  type LineItemsField,
  type LineItemsRowData,
} from "@tailor-platform/app-shell";

/* ======================================================================== */
/* Domain — Work Order                                                       */
/* Components and operations have DIFFERENT row types under one header.      */
/* ======================================================================== */

type ComponentLine = LineItemsRowData & {
  partSku: string;
  partName: string;
  qtyRequired: number;
  uom: string;
};

type OperationLine = LineItemsRowData & {
  sequence: number;
  step: string;
  workstation: string;
  durationMinutes: number;
};

const UOM_OPTIONS = [
  { value: "EA", label: "EA", description: "Each" },
  { value: "KG", label: "KG", description: "Kilogram" },
  { value: "M", label: "M", description: "Meter" },
];

const WORKSTATION_OPTIONS = [
  { value: "WS-01", label: "WS-01", description: "Cutting" },
  { value: "WS-02", label: "WS-02", description: "Sewing" },
  { value: "WS-03", label: "WS-03", description: "Pressing" },
  { value: "WS-04", label: "WS-04", description: "QA" },
];

/* ======================================================================== */
/* Field schemas                                                             */
/* ======================================================================== */

const fc = createLineItemHelper<ComponentLine>();
const fo = createLineItemHelper<OperationLine>();

const componentFields: LineItemsField<ComponentLine>[] = [
  fc.field({
    key: "partSku",
    label: "Part SKU",
    render: (l) => l.partSku,
    editable: ["edit"],
    type: { kind: "text" },
    width: 160,
    pinned: "left",
  }),
  fc.field({
    key: "partName",
    label: "Part name",
    render: (l) => l.partName,
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
  }),
  fc.field({
    key: "qtyRequired",
    label: "Qty required",
    render: (l) => l.qtyRequired,
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    width: 130,
  }),
  fc.field({
    key: "uom",
    label: "UOM",
    render: (l) => l.uom,
    editable: ["edit"],
    type: { kind: "select", options: UOM_OPTIONS },
    width: 100,
  }),
];

const operationFields: LineItemsField<OperationLine>[] = [
  fo.field({
    key: "sequence",
    label: "Seq",
    render: (l) => l.sequence,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    sort: { comparator: (a, b) => a.sequence - b.sequence },
    width: 80,
    pinned: "left",
  }),
  fo.field({
    key: "step",
    label: "Step",
    render: (l) => l.step,
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
  }),
  fo.field({
    key: "workstation",
    label: "Workstation",
    render: (l) => l.workstation,
    editable: ["edit"],
    type: { kind: "select", options: WORKSTATION_OPTIONS },
    width: 160,
  }),
  fo.field({
    key: "durationMinutes",
    label: "Duration (min)",
    render: (l) => l.durationMinutes,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 140,
  }),
];

const PARTS_CATALOG: ReadonlyArray<{ partSku: string; partName: string; uom: string }> = [
  { partSku: "FAB-001", partName: "Indigo denim", uom: "M" },
  { partSku: "FAB-002", partName: "Cotton fabric", uom: "M" },
  { partSku: "TR-220", partName: "Cotton thread", uom: "M" },
  { partSku: "BTN-010", partName: "Brass buttons", uom: "EA" },
  { partSku: "ZIP-007", partName: 'YKK zipper 7"', uom: "EA" },
];

const STEP_CATALOG: ReadonlyArray<{ step: string; workstation: string; durationMinutes: number }> =
  [
    { step: "Cut fabric", workstation: "WS-01", durationMinutes: 15 },
    { step: "Sew panels", workstation: "WS-02", durationMinutes: 45 },
    { step: "Attach zipper", workstation: "WS-02", durationMinutes: 12 },
    { step: "Press seams", workstation: "WS-03", durationMinutes: 8 },
    { step: "Final QA inspect", workstation: "WS-04", durationMinutes: 6 },
  ];

const seedComponents = (): ComponentLine[] => [
  { lineRef: "C1", partSku: "FAB-001", partName: "Indigo denim", qtyRequired: 2.5, uom: "M" },
  { lineRef: "C2", partSku: "TR-220", partName: "Cotton thread", qtyRequired: 200, uom: "M" },
  { lineRef: "C3", partSku: "BTN-010", partName: "Brass buttons", qtyRequired: 12, uom: "EA" },
  { lineRef: "C4", partSku: "ZIP-007", partName: 'YKK zipper 7"', qtyRequired: 1, uom: "EA" },
];

const seedOperations = (): OperationLine[] => [
  { lineRef: "O1", sequence: 10, step: "Cut fabric", workstation: "WS-01", durationMinutes: 15 },
  { lineRef: "O2", sequence: 20, step: "Sew panels", workstation: "WS-02", durationMinutes: 45 },
  { lineRef: "O3", sequence: 30, step: "Attach zipper", workstation: "WS-02", durationMinutes: 12 },
  { lineRef: "O4", sequence: 40, step: "Press seams", workstation: "WS-03", durationMinutes: 8 },
  {
    lineRef: "O5",
    sequence: 50,
    step: "Final QA inspect",
    workstation: "WS-04",
    durationMinutes: 6,
  },
];

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const workOrderDemoResource = defineResource({
  path: "work-order-demo",
  component: WorkOrderDemoPage,
  meta: { title: "Work Order (multi-collection)" },
});

export function WorkOrderDemoPage() {
  const components = useLineItems<ComponentLine>({
    fields: componentFields,
    data: seedComponents(),
    mode: "edit",
    selection: true,
  });
  const operations = useLineItems<OperationLine>({
    fields: operationFields,
    data: seedOperations(),
    mode: "edit",
    selection: true,
  });

  // ✅ Reusable Pattern: bundle two heterogeneous collections under one header
  // — different row types, different field schemas, one shared submit boundary.
  const group = useLineItemsGroup({ components, operations });

  const totalDuration = operations.allLines.reduce((s, l) => s + Number(l.durationMinutes), 0);

  const handleSave = React.useCallback(() => {
    const cs = group.getChangeSet();
    if (cs.isEmpty) return;
    // eslint-disable-next-line no-console
    console.log("[work order] save", cs);
    group.reset();
  }, [group]);

  return (
    <Layout>
      <Layout.Header
        title="Work Order WO-2026-0042"
        actions={[
          <Button
            key="discard"
            variant="secondary"
            size="sm"
            onClick={() => group.revert()}
            disabled={!group.isDirty}
          >
            Discard
          </Button>,
          <Button key="save" size="sm" onClick={() => void handleSave()} disabled={!group.isDirty}>
            Save changes
          </Button>,
        ]}
      />
      <Layout.Column>
        <Card.Root>
          <Card.Content className="astw:flex astw:flex-wrap astw:items-center astw:gap-6 astw:py-3">
            <Stat label="Components" value={`${components.allLines.length} parts`} />
            <Stat label="Operations" value={`${operations.allLines.length} steps`} />
            <Stat label="Total duration" value={`${totalDuration} min`} />
            {group.isDirty ? (
              <span className="astw:text-muted-foreground astw:text-xs">
                Unsaved changes across both collections
              </span>
            ) : null}
          </Card.Content>
        </Card.Root>

        <CollectionSection
          title="Components"
          hook={components}
          bottomRow={
            <AddComponentLineRow
              onPick={(p) =>
                components.addLine({
                  partSku: p.partSku,
                  partName: p.partName,
                  qtyRequired: 1,
                  uom: p.uom,
                })
              }
            />
          }
        />
        <CollectionSection
          title="Operations"
          hook={operations}
          bottomRow={
            <AddOperationLineRow
              onPick={(p) => {
                const nextSeq =
                  operations.allLines.length > 0
                    ? Math.max(...operations.allLines.map((l) => l.sequence)) + 10
                    : 10;
                operations.addLine({
                  sequence: nextSeq,
                  step: p.step,
                  workstation: p.workstation,
                  durationMinutes: p.durationMinutes,
                });
              }}
            />
          }
        />
      </Layout.Column>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="astw:flex astw:flex-col">
      <span className="astw:text-muted-foreground astw:text-xs astw:font-medium">{label}</span>
      <span className="astw:text-foreground astw:text-base astw:font-semibold astw:tabular-nums">
        {value}
      </span>
    </div>
  );
}

function CollectionSection<T extends LineItemsRowData>({
  title,
  hook,
  bottomRow,
}: {
  title: string;
  hook: ReturnType<typeof useLineItems<T>>;
  bottomRow?: React.ReactNode;
}) {
  return (
    <LineItems.Root value={hook}>
      <Card.Root className="astw:overflow-hidden">
        <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
          <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
            <h3 className="astw:leading-none astw:font-semibold">{title}</h3>
            <p className="astw:text-muted-foreground astw:text-sm">
              {hook.allLines.length} lines{hook.isDirty ? " · Modified" : ""}
            </p>
          </div>
          <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-1">
            <LineItems.SearchToggle
              variant="outline"
              triggerSizeClassName="astw:size-8"
              collapsedWidth={32}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => alert("Import from CSV clicked")}
            >
              Import from CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => alert("Bulk add clicked")}
            >
              Bulk add
            </Button>
            <LineItems.FullscreenToggle variant="outline" className="astw:size-8" />
          </div>
        </Card.Header>
        <Card.Content className="astw:flex astw:flex-col astw:p-0">
          <LineItems.Table
            maxBodyHeight={320}
            renderFullscreenToggle={false}
            tableContainerClassName="astw:rounded-none astw:border-0"
          />
          {bottomRow}
        </Card.Content>
      </Card.Root>
    </LineItems.Root>
  );
}

type PartItem = { partSku: string; partName: string; uom: string };
type StepItem = { step: string; workstation: string; durationMinutes: number };

function AddComponentLineRow({ onPick }: { onPick: (p: PartItem) => void }) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
      <Combobox<PartItem>
        key={resetKey}
        items={PARTS_CATALOG as PartItem[]}
        placeholder="+   Add line item — type to search…"
        emptyText="No matching parts."
        mapItem={(p) => ({
          key: p.partSku,
          label: `${p.partSku} ${p.partName}`,
          render: (
            <div className="astw:flex astw:flex-col astw:gap-0.5">
              <span className="astw:text-sm astw:font-medium">{p.partSku}</span>
              <span className="astw:text-muted-foreground astw:text-xs">{p.partName}</span>
            </div>
          ),
        })}
        onValueChange={(picked) => {
          if (!picked) return;
          onPick(picked);
          setResetKey((k) => k + 1);
        }}
        className="astw:flex-1"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => alert("Bulk add clicked")}
        style={{ boxShadow: "none" }}
      >
        Bulk add
      </Button>
    </div>
  );
}

function AddOperationLineRow({ onPick }: { onPick: (p: StepItem) => void }) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
      <Combobox<StepItem>
        key={resetKey}
        items={STEP_CATALOG as StepItem[]}
        placeholder="+   Add line item — type to search…"
        emptyText="No matching steps."
        mapItem={(p) => ({
          key: p.step,
          label: `${p.step} ${p.workstation}`,
          render: (
            <div className="astw:flex astw:flex-col astw:gap-0.5">
              <span className="astw:text-sm astw:font-medium">{p.step}</span>
              <span className="astw:text-muted-foreground astw:text-xs">{`${p.workstation} · ${p.durationMinutes} min`}</span>
            </div>
          ),
        })}
        onValueChange={(picked) => {
          if (!picked) return;
          onPick(picked);
          setResetKey((k) => k + 1);
        }}
        className="astw:flex-1"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => alert("Bulk add clicked")}
        style={{ boxShadow: "none" }}
      >
        Bulk add
      </Button>
    </div>
  );
}
