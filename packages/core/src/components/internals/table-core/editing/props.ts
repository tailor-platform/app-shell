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

/**
 * Input and draft behavior shared by concrete editors; cell presentation and row adoption stay with the owner.
 * Draft notifications need not have the confirmed output's shape: numeric drafts, for example, remain raw text.
 *
 * @typeParam TOptions - Settings consumed by this input implementation.
 * @typeParam TOutput - Parsed value passed to commit, including any supported clear value.
 */
export interface CellEditorProps<TOptions, TOutput = unknown> {
  /** Concrete input settings, without an editor-kind discriminator. */
  options: TOptions;
  /** Latest owner-adopted value, not the local draft; normalized by the selected editor. */
  current: unknown;
  /**
   * Optional draft/restoration notification; its editor-specific payload may be unparsed.
   * This is not a request to adopt a confirmed value. Restoration errors after cancellation are ignored
   * when error interception is enabled.
   */
  change?: (draft: unknown) => unknown;
  /**
   * Confirms a changed, parsed value; the owner decides whether and how to adopt it.
   * With error interception enabled, a throw or rejected promise retains the draft for retry.
   * A callback's return value is not adopted as cell data.
   */
  commit: (value: TOutput) => unknown;
  /** Custom, user-safe callback-error content; parsing feedback remains input-owned. */
  renderError?: (error: unknown) => ReactNode;
  /**
   * Whether a local session retains callback failures (default true); false uses eager, caller-owned error handling.
   * An external session's owner configures its error policy instead.
   */
  interceptErrors?: boolean;
  /**
   * Optional owner-retained draft/failure session across view remounts; the owner manages activation and disposal.
   * Omit for a local session that deactivates on unmount. An active draft must keep the same editor-specific shape.
   */
  session?: ReturnType<typeof createCellEditSession<unknown>>;
  /** Owner-localized input messages, hints, and accessible error-control labels. */
  labels: CellEditorLabels;
  /** Owner namespace for generated data-slot attributes, such as data-table or line-items. */
  slotPrefix: string;
  /** Stable logical row identity for optional focus navigation, rather than a row index. */
  rowKey: string;
  /** Stable display-column identity for optional focus navigation; need not equal a row property key. */
  colKey: string;
  /** Accessible name of the input; some controls append the formatted or draft value. */
  label: string;
  /** Input text alignment; the owner supplies matching alignment for the table cell. */
  align: "left" | "center" | "right";
  /** Optional table-managed focus registration and Tab movement; omitted controls use the native Tab order. */
  navigation?: CellEditorNavigation;
  /** Formatted text for accessible control names; EditableCell derives it only when display is a string. */
  valueLabel?: string;
  /** Render-time composition of the input and interaction state, not a state-change notification. */
  children: (view: CellEditorView) => ReactNode;
}

export interface DateTimeDraft {
  day: string | null;
  time: string | null;
}
