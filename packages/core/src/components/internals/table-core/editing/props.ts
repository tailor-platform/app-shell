import type { ComponentProps, ReactNode } from "react";
import type { Table } from "@/components/table";
import type { createCellEditSession } from "../cell-session";

/** Localized by the table owner, including names scoped to the current cell. */
export interface CellEditorLabels {
  notANumber: string;
  revertHint: string;
  callbackError: string;
  errorHint: string;
  showError: string;
  errorDialog: string;
  closeError: string;
  none: string;
  noMatches: string;
  chooseTime: string;
  clear: string;
  done: string;
}

export type CellEditorConfig =
  | { type: "text" | "number" }
  | {
      type: "choice";
      options: readonly { value: string; label: string }[];
      renderOption?: (value: string, label: string) => ReactNode;
    }
  | { type: "date"; withTime?: boolean };

/** Optional owner-controlled Tab navigation; omitted tables use native Tab order. */
export interface CellEditorNavigation {
  register: (rowKey: string, colKey: string, element: HTMLElement) => () => void;
  move: (from: { rowKey: string; colKey: string }, direction: "next" | "prev") => boolean;
}

/** UI mechanisms only; row access, callback binding, permissions and adoption belong to the owner. */
export interface CellEditorProps {
  config: CellEditorConfig;
  current: unknown;
  display: ReactNode;
  change?: (draft: unknown) => unknown;
  commit: (value: unknown) => unknown;
  renderError?: (error: unknown) => ReactNode;
  interceptErrors?: boolean;
  /** External sessions outlive controls; their owner handles activation and disposal. */
  session?: ReturnType<typeof createCellEditSession<unknown>>;
  labels: CellEditorLabels;
  slotPrefix: string;
  rowKey: string;
  colKey: string;
  label: string;
  align: "left" | "center" | "right";
  truncate?: boolean;
  tooltipLabel?: string;
  timeZone: string;
  navigation?: CellEditorNavigation;
  cellProps: ComponentProps<typeof Table.Cell>;
}

export interface DateTimeDraft {
  day: string | null;
  time: string | null;
}
