import { render, screen, within } from "@testing-library/react";
import {
  LineItems,
  SidebarLayout,
  defineModule,
  useLineItems,
  type LineItemsColumn,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { describe, expect, it } from "vitest";

type Line = { id?: string; value: string | null; allowed: boolean };
type Kind = "combobox" | "date";
type Align = "left" | "center" | "right";
const longLabel = "A deliberately long closing-day description that does not fit in the cell";

function SpacingTable({
  kind,
  align,
  clipped = false,
}: {
  kind: Kind;
  align: Align;
  clipped?: boolean;
}) {
  const column: LineItemsColumn<Line> = {
    accessorKey: "value",
    label: "Value",
    type: kind === "date" ? "date" : "text",
    align,
    render: clipped
      ? () => <span className="astw:block astw:truncate">{longLabel}</span>
      : undefined,
    edit:
      kind === "date"
        ? { editorType: "date", canEdit: (row) => row.allowed }
        : {
            editorType: "combobox",
            canEdit: (row) => row.allowed,
            editorOptions: { options: [{ value: "2026-12-01", label: "Closing day" }] },
          },
  };
  const value = useLineItems<Line>({
    columns: [column],
    defaultLines: [
      { id: "A", value: "2026-12-01", allowed: true },
      { id: "B", value: "2026-12-01", allowed: false },
    ],
    orderer: false,
  });
  return (
    <div style={{ width: 240 }}>
      <LineItems.Root value={value}>
        <LineItems.Table
          className="astw:table-fixed"
          aria-label={clipped ? "Clipped" : "Aligned"}
        />
      </LineItems.Root>
    </div>
  );
}

const cases = (["combobox", "date"] as const).flatMap((kind) =>
  (["left", "center", "right"] as const).map((align) => ({ kind, align })),
);

describe("LineItems mixed-permission value geometry", () => {
  it.each(cases)(
    "aligns $kind values and clipping bounds with $align alignment",
    async ({ kind, align }) => {
      render(
        <AppShell
          memory
          initialEntries={["/spacing"]}
          locale="en"
          modules={[
            defineModule({
              path: "spacing",
              meta: { title: "Spacing" },
              component: () => (
                <>
                  <SpacingTable kind={kind} align={align} />
                  <SpacingTable kind={kind} align={align} clipped />
                </>
              ),
              resources: [],
            }),
          ]}
        >
          <SidebarLayout />
        </AppShell>,
      );
      const aligned = await screen.findByRole("table", { name: "Aligned" });
      const clipped = screen.getByRole("table", { name: "Clipped" });
      for (const table of [aligned, clipped]) {
        const [editable, readonly] = within(table).getAllByRole("cell");
        const editablePreview = editable.firstElementChild as HTMLElement;
        const readonlyPreview = readonly.firstElementChild as HTMLElement;
        expect(getComputedStyle(editablePreview).paddingRight).toBe("20px");
        expect(getComputedStyle(readonlyPreview).paddingRight).toBe("20px");
        expect(getComputedStyle(readonly).textAlign).toBe(align);
        expect(readonly.querySelector("input, button, svg")).toBeNull();
        const previews = [editablePreview, readonlyPreview];
        const textBounds = previews.map((preview) => {
          const range = document.createRange();
          range.selectNodeContents(preview);
          return range.getBoundingClientRect();
        });
        expect(textBounds[0].left).toBeCloseTo(textBounds[1].left, 1);
        expect(textBounds[0].right).toBeCloseTo(textBounds[1].right, 1);
        if (table === clipped) {
          const [editableClip, readonlyClip] = previews.map(
            (preview) => preview.firstElementChild as HTMLElement,
          );
          expect(editableClip.scrollWidth).toBeGreaterThan(editableClip.clientWidth);
          expect(readonlyClip.scrollWidth).toBeGreaterThan(readonlyClip.clientWidth);
          expect(editableClip.getBoundingClientRect().left).toBeCloseTo(
            readonlyClip.getBoundingClientRect().left,
            1,
          );
          expect(editableClip.getBoundingClientRect().right).toBeCloseTo(
            readonlyClip.getBoundingClientRect().right,
            1,
          );
        }
      }
    },
  );
});
