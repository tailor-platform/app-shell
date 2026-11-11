import { useMemo } from "react";
import { type ExternalToast, toast as sonnerToast } from "sonner";
import {
  useAppShellConfig,
  type ToastDefault,
  type ToastDefaults,
} from "@/contexts/appshell-context";

type Toast = typeof sonnerToast;
// A mapped type over `typeof toast` keeps its methods and drops the call signature.
type ToastMethods = Omit<Toast, never>;
type PromiseData<T> = NonNullable<Parameters<typeof sonnerToast.promise<T>>[1]>;
type PromiseErrorResult = Exclude<PromiseData<unknown>["error"], (...args: never[]) => unknown>;
type PromiseErrorOptions = Extract<PromiseErrorResult, { message: unknown }>;

/**
 * Sonner closes every toast after 4 s, whatever its type. A failed save that disappears
 * before the user reads it, or an Undo that vanishes while the user reaches for it, is
 * worse than no toast. So errors and toasts that carry an `action` stay until the user
 * closes them, and they get a close button. Options the caller passes win, and an app
 * replaces either default through `<AppShell toastDefaults>`.
 * Why: docs-src/patterns/interaction-toast.docs.outline.md (Constraints).
 */
const STAY_UNTIL_CLOSED: ToastDefault = { duration: Infinity, closeButton: true };

const isErrorOptions = (result: PromiseErrorResult): result is PromiseErrorOptions =>
  typeof result === "object" && result !== null && "message" in result;

const applyDefault = (
  data: ExternalToast | undefined,
  fallback: ToastDefault,
): ExternalToast | undefined => {
  // A toast the user cannot dismiss gets no close button from Sonner (it draws one that does
  // nothing) and must not stay open by default either, or nothing but `toast.dismiss(id)` ends
  // it. It keeps Sonner's defaults; a caller that closes it in code passes `duration: Infinity`.
  if (data?.dismissible === false) return data;
  return {
    ...data,
    duration: data?.duration ?? fallback.duration,
    closeButton: data?.closeButton ?? fallback.closeButton,
  };
};

const createToast = (defaults: ToastDefaults): Toast => {
  const errorDefault = defaults.error ?? STAY_UNTIL_CLOSED;
  const actionDefault = defaults.action ?? STAY_UNTIL_CLOSED;

  const withActionDefaults = (data?: ExternalToast): ExternalToast | undefined => {
    if (data?.action) return applyDefault(data, actionDefault);
    if (data?.id === undefined) return data;
    // Sonner updates a toast by `id` by merging into the stored one, so the sticky defaults of
    // an earlier error or action toast would survive into this one. An explicit `undefined`
    // resets them; a `duration` or `closeButton` the caller passes stays.
    return { ...data, duration: data.duration, closeButton: data.closeButton };
  };

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
      // Only the error state's own `dismissible` counts: Sonner resets `dismissible` to true when
      // it turns the loading toast into the error toast, so a call-level `false` ends there.
      if (options.dismissible === false) return options;
      return {
        ...options,
        duration: options.duration ?? data.duration ?? errorDefault.duration,
        closeButton: options.closeButton ?? data.closeButton ?? errorDefault.closeButton,
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
    error: (message, data) => sonnerToast.error(message, applyDefault(data, errorDefault)),
    promise: (promise, data) =>
      sonnerToast.promise(promise, data && withPromiseErrorDefaults(data)),
    // `custom` renders the caller's JSX alone: Sonner draws neither the action nor the close
    // button for it, so a sticky default would leave nothing to close with. It passes through.
    custom: sonnerToast.custom,
    dismiss: sonnerToast.dismiss,
    getHistory: sonnerToast.getHistory,
    getToasts: sonnerToast.getToasts,
  };

  return Object.assign(
    (message: Parameters<Toast>[0], data?: ExternalToast) =>
      sonnerToast(message, withActionDefaults(data)),
    methods,
  );
};

const builtInToast = createToast({});

export const useToast = (): Toast => {
  const { toastDefaults } = useAppShellConfig().configurations;
  return useMemo(
    () => (toastDefaults ? createToast(toastDefaults) : builtInToast),
    [toastDefaults],
  );
};
