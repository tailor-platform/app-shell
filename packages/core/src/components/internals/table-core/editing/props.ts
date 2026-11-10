import type { ReactNode, RefObject } from "react";
import type { CellEditFailure, createCellEditSession } from "../cell-session";

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

/** Optional owner-controlled Tab navigation; omitted tables use native Tab order. */
export interface CellEditorNavigation {
  register: (rowKey: string, colKey: string, element: HTMLElement) => () => void;
  move: (from: { rowKey: string; colKey: string }, direction: "next" | "prev") => boolean;
}

export interface CellErrorUI {
  failure: CellEditFailure;
  id: string;
  message: string;
  content: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
  popupRef: RefObject<HTMLDivElement | null>;
  containsTarget: (target: EventTarget | null) => boolean;
}

/** Input behavior passed to the cell's frame during the same render, without mirrored state. */
export interface CellEditorView {
  input: ReactNode;
  editing: boolean;
  confirming: boolean;
  callbackError?: CellErrorUI;
  onEditorLeave?: () => void;
  onEditorCancel: () => void;
  getFailure: () => CellEditFailure | undefined;
  /** Date input preview; column formatting remains owned by the cell. */
  draftPreview?: string;
}

/** Input behavior and presentation policy injected into a cell, independent of editor kinds. */
export interface CellEditor<TOptions, TOutput> {
  Editor: (props: CellEditorProps<TOptions, TOutput>) => ReactNode;
  icon?: ReactNode;
  hideDisplay?: {
    idle?: "focused" | "forced-colors";
    editing?: "focused" | "forced-colors";
  };
}

/** Infer the contract from its implementation rather than maintaining a separate editor map. */
export type CellEditorOptions<TEditor> =
  TEditor extends CellEditor<infer TOptions, infer _TOutput> ? TOptions : never;
export type CellEditorOutput<TEditor> =
  TEditor extends CellEditor<infer _TOptions, infer TOutput> ? TOutput : never;

/** Input and draft behavior only; cell presentation and row adoption belong to their owners. */
export interface CellEditorProps<TOptions, TOutput = unknown> {
  options: TOptions;
  current: unknown;
  change?: (draft: unknown) => unknown;
  commit: (value: TOutput) => unknown;
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
  timeZone: string;
  navigation?: CellEditorNavigation;
  /** Formatted value used to name input controls whose value is visually hidden. */
  valueLabel?: string;
  children: (view: CellEditorView) => ReactNode;
}

export interface DateTimeDraft {
  day: string | null;
  time: string | null;
}
