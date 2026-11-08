import { type ExternalToast, toast as sonnerToast } from "sonner";

type Toast = typeof sonnerToast;
type ToastMethods = Omit<Toast, never>;
type PromiseData<T> = NonNullable<Parameters<typeof sonnerToast.promise<T>>[1]>;
type PromiseErrorResult = Exclude<PromiseData<unknown>["error"], (...args: never[]) => unknown>;
type PromiseErrorOptions = Extract<PromiseErrorResult, { message: unknown }>;

/**
 * Sonner closes every toast after 4 s, whatever its type. A failed save that disappears
 * before the user reads it, or an Undo that vanishes while the user reaches for it, is
 * worse than no toast. So errors and toasts that carry an `action` stay until the user
 * closes them, and they get a close button. Options the caller passes win.
 * Why: docs-src/patterns/interaction-toast.docs.outline.md (Constraints).
 */
const stayUntilClosed = (data?: ExternalToast): ExternalToast => ({
  ...data,
  duration: data?.duration ?? Infinity,
  closeButton: data?.closeButton ?? true,
});

const withActionDefaults = (data?: ExternalToast): ExternalToast | undefined =>
  data?.action ? stayUntilClosed(data) : data;

const isErrorOptions = (result: PromiseErrorResult): result is PromiseErrorOptions =>
  typeof result === "object" && result !== null && "message" in result;

/**
 * `toast.promise` describes its error state as a message, a `{ message, ...options }` object,
 * or a function returning either. The top-level `duration` / `closeButton` of the call apply
 * to every state, so they stand in for the defaults; the error state's own options win.
 */
const withPromiseErrorDefaults = <T>(data: PromiseData<T>): PromiseData<T> => {
  const { error } = data;
  if (error === undefined) return data;
  const apply = (result: PromiseErrorResult): PromiseErrorOptions => {
    const options = isErrorOptions(result) ? result : { message: result };
    return {
      ...options,
      duration: options.duration ?? data.duration ?? Infinity,
      closeButton: options.closeButton ?? data.closeButton ?? true,
    };
  };
  return {
    ...data,
    error:
      typeof error === "function"
        ? async (reason: unknown) => apply(await error(reason))
        : apply(error),
  };
};

const methods: ToastMethods = {
  success: (message, data) => sonnerToast.success(message, withActionDefaults(data)),
  info: (message, data) => sonnerToast.info(message, withActionDefaults(data)),
  warning: (message, data) => sonnerToast.warning(message, withActionDefaults(data)),
  message: (message, data) => sonnerToast.message(message, withActionDefaults(data)),
  loading: (message, data) => sonnerToast.loading(message, withActionDefaults(data)),
  error: (message, data) => sonnerToast.error(message, stayUntilClosed(data)),
  promise: (promise, data) => sonnerToast.promise(promise, data && withPromiseErrorDefaults(data)),
  // `custom` renders the caller's JSX alone: Sonner draws neither the action nor the close
  // button for it, so a sticky default would leave nothing to close with. It passes through.
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
  getHistory: sonnerToast.getHistory,
  getToasts: sonnerToast.getToasts,
};

const toast: Toast = Object.assign(
  (message: Parameters<Toast>[0], data?: ExternalToast) =>
    sonnerToast(message, withActionDefaults(data)),
  methods,
);

export const useToast = (): Toast => {
  return toast;
};
