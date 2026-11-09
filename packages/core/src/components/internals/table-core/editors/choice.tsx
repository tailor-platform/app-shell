import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { ComboboxParts } from "@/components/combobox";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { defineI18nLabels } from "@/hooks/i18n";
import { useAsyncItems, type AsyncFetcher } from "@/hooks/use-async-items";
import { isComposing } from "@/lib/is-composing";
import { cn } from "@/lib/utils";
import { CELL_ERROR_CLASS_NAME, ICON_INPUT_CLASS_NAME, INPUT_CLASS_NAME } from "../cell-styles";

export type ChoiceOption<TValue extends string | number = string | number> = {
  value: TValue;
  label: string;
  description?: string;
};

export type ChoiceEditorConfig<TRow> =
  | {
      options: readonly ChoiceOption[];
      fetcher?: never;
      getOptionLabel?: never;
      placeholder?: string;
    }
  | {
      options?: never;
      fetcher: AsyncFetcher<ChoiceOption>;
      getOptionLabel: (value: string | number, row: TRow) => string;
      placeholder?: string;
    };

export type ChoiceEditorProps<TRow> = {
  value: string | number | null;
  row: TRow;
  config: ChoiceEditorConfig<TRow>;
  ariaLabel: string;
  invalid?: boolean;
  describedBy?: string;
  onCommit: (value: string | number | null) => void | Promise<boolean>;
  onCancel: () => void;
  onBegin?: () => void;
  onActiveChange?: (active: boolean) => void;
  cancelToken?: number;
  /** Keep a retained failed/confirming value visible after focus leaves. */
  showValue?: boolean;
  containsErrorTarget?: (target: EventTarget | null) => boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputClassName?: string;
  /** Optional owner-controlled editing, for resting read-only inputs. */
  editing?: boolean;
  onFocus?: () => void;
  onLeave?: () => void;
  onQueryChange?: () => void;
  confirmOnTab?: boolean;
  onTab?: (event: KeyboardEvent<HTMLInputElement>) => void;
  retry?: () => Promise<boolean>;
  nullOptionLabel?: string;
  emptyLabel?: string;
  renderOption?: (option: ChoiceCandidate) => ReactNode;
};

type ChoiceCandidate = { value: string | number | null; label: string; description?: string };

type Source = {
  options: readonly ChoiceOption[];
  remote: boolean;
  revision?: unknown;
  loading?: boolean;
  failed?: boolean;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  retry?: () => void;
};

const labels = defineI18nLabels({
  en: {
    clear: "Clear value",
    loading: "Loading options...",
    failed: "Could not load options.",
    retry: "Retry",
    empty: "No matching options.",
  },
  ja: {
    clear: "値をクリア",
    loading: "候補を読み込み中...",
    failed: "候補を読み込めませんでした。",
    retry: "再試行",
    empty: "一致する候補がありません。",
  },
});

const searchable = (text: string) => text.normalize("NFKC").toLocaleLowerCase().trim();
const equalOption = (left: ChoiceCandidate, right: ChoiceCandidate) =>
  Object.is(left.value, right.value);
const optionLabel = (option: ChoiceCandidate) => option.label;

/** Values are separate from search text, highlight, and the current result window. */
export function ChoiceEditor<TRow>(props: ChoiceEditorProps<TRow>) {
  if (props.config.fetcher) return <RemoteChoiceEditor {...props} config={props.config} />;
  return (
    <ChoiceControl {...props} source={{ options: props.config.options ?? [], remote: false }} />
  );
}

function RemoteChoiceEditor<TRow>({
  config,
  ...props
}: ChoiceEditorProps<TRow> & {
  config: Extract<ChoiceEditorConfig<TRow>, { fetcher: AsyncFetcher<ChoiceOption> }>;
}) {
  const desired = useRef({ query: null as string | null, revision: 0 });
  const committedSource = useRef(config.fetcher);
  useLayoutEffect(() => {
    if (committedSource.current === config.fetcher) return;
    committedSource.current = config.fetcher;
    desired.current = { ...desired.current, revision: desired.current.revision + 1 };
    setRequested(desired.current.revision);
    setSettled(null);
  }, [config.fetcher]);
  const [requested, setRequested] = useState(0);
  const [settled, setSettled] = useState<{
    revision: number;
    failed: boolean;
    source: typeof config.fetcher;
  } | null>(null);
  const fetcher = useMemo<AsyncFetcher<ChoiceOption>>(() => {
    const fn = typeof config.fetcher === "function" ? config.fetcher : config.fetcher.fn;
    const load = async (query: string | null, options: { signal: AbortSignal }) => {
      const revision = desired.current.revision;
      try {
        const result = await fn(query, options);
        if (
          options.signal.aborted ||
          committedSource.current !== config.fetcher ||
          revision !== desired.current.revision ||
          query !== desired.current.query
        )
          throw new DOMException("Superseded search", "AbortError");
        setSettled({ revision, failed: false, source: config.fetcher });
        return result;
      } catch (error) {
        if (
          !options.signal.aborted &&
          committedSource.current === config.fetcher &&
          revision === desired.current.revision &&
          query === desired.current.query
        )
          setSettled({ revision, failed: true, source: config.fetcher });
        throw error;
      }
    };
    return typeof config.fetcher === "function"
      ? load
      : { fn: load, debounceMs: config.fetcher.debounceMs };
  }, [config.fetcher]);
  const asyncItems = useAsyncItems({ fetcher });
  const currentSource = settled?.source === config.fetcher;
  const pending = !currentSource || settled?.revision !== requested || asyncItems.loading;
  const failed = currentSource && settled?.revision === requested && settled.failed;
  const search = (query: string) => {
    desired.current = { query: query.trim() || null, revision: desired.current.revision + 1 };
    setRequested(desired.current.revision);
    asyncItems.onInputValueChange(query);
  };
  const retry = () => {
    desired.current = { ...desired.current, revision: desired.current.revision + 1 };
    setRequested(desired.current.revision);
    asyncItems.retry();
  };
  return (
    <ChoiceControl
      {...props}
      config={config}
      source={{
        options: currentSource ? asyncItems.items : [],
        remote: true,
        revision: config.fetcher,
        loading: pending,
        failed,
        onSearch: search,
        onOpen: () => search(""),
        retry,
      }}
    />
  );
}

function ChoiceControl<TRow>({
  value,
  row,
  config,
  ariaLabel,
  invalid,
  describedBy,
  onCommit,
  onCancel,
  onBegin,
  onActiveChange,
  cancelToken,
  showValue,
  containsErrorTarget,
  inputRef,
  inputClassName,
  editing,
  onFocus,
  onLeave,
  onQueryChange,
  confirmOnTab,
  onTab,
  retry,
  nullOptionLabel,
  emptyLabel,
  renderOption,
  source,
}: ChoiceEditorProps<TRow> & { source: Source }) {
  const t = labels.useT();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState<string | null>(null);
  const previousCancel = useRef(cancelToken);
  const previousSource = useRef(source.revision);
  const operation = useRef(0);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onActiveChange?.(false);
    };
  }, [onActiveChange]);
  const composing = useRef(false);
  const highlighted = useRef<ChoiceCandidate | undefined>(undefined);
  const explicitHighlight = useRef<ChoiceCandidate | undefined>(undefined);
  const selectOnMouseUp = useRef(false);
  useLayoutEffect(() => {
    if (previousCancel.current === cancelToken && previousSource.current === source.revision)
      return;
    previousCancel.current = cancelToken;
    previousSource.current = source.revision;
    operation.current++;
    openRef.current = false;
    setOpen(false);
    setQuery(null);
    highlighted.current = undefined;
    explicitHighlight.current = undefined;
    onActiveChange?.(focused);
  }, [cancelToken, source.revision, focused, onActiveChange]);
  const blocked = !!source.loading || !!source.failed;
  const items = useMemo<readonly ChoiceCandidate[]>(
    () =>
      nullOptionLabel !== undefined
        ? [{ value: null, label: nullOptionLabel }, ...source.options]
        : source.options,
    [nullOptionLabel, source.options],
  );
  const selected =
    value === null
      ? (items.find((item) => item.value === null) ?? null)
      : (items.find((item) => Object.is(item.value, value)) ?? {
          value,
          label: config.getOptionLabel?.(value, row) ?? String(value),
        });
  const filtered = useMemo(() => {
    if (source.loading || source.failed) return [];
    if (source.remote) return source.options;
    const search = searchable(listQuery ?? "");
    if (!search) return items;
    const rank = (option: ChoiceCandidate) => {
      const label = searchable(option.label);
      if (label === search) return 0;
      return label.startsWith(search) ? 1 : 2;
    };
    return items
      .filter((option) => option.value !== null && searchable(option.label).includes(search))
      .toSorted((left, right) => rank(left) - rank(right));
  }, [items, source.options, source.remote, source.loading, source.failed, listQuery]);

  function start(fromInput = false) {
    if (openRef.current) return;
    operation.current++;
    openRef.current = true;
    setOpen(true);
    if (!fromInput) {
      setQuery(null);
      setListQuery(null);
    }
    highlighted.current = undefined;
    explicitHighlight.current = undefined;
    onBegin?.();
    onActiveChange?.(true);
    if (!fromInput) source.onOpen?.();
  }
  function close(cancel: boolean) {
    operation.current++;
    openRef.current = false;
    setOpen(false);
    setQuery(null);
    highlighted.current = undefined;
    explicitHighlight.current = undefined;
    onActiveChange?.(focused);
    if (cancel) onCancel();
  }
  function leave() {
    close(false);
    if (onLeave) onLeave();
    else if (!invalid) onCancel();
  }
  function finish(result: void | Promise<boolean>) {
    if (!result) {
      close(false);
      return;
    }
    const attempt = operation.current;
    void result.then((ok) => {
      if (ok && mounted.current && attempt === operation.current) close(false);
    });
  }
  function pick(option: ChoiceCandidate) {
    if (blocked || !filtered.includes(option)) return;
    finish(onCommit(option.value));
  }
  const keyDown: NonNullable<ComponentProps<typeof ComboboxParts.Input>["onKeyDown"]> = (event) => {
    if (isComposing(event.nativeEvent, composing.current)) {
      event.preventBaseUIHandler();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.preventBaseUIHandler();
      close(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.preventBaseUIHandler();
      if (!openRef.current) {
        if (retry) finish(retry());
        else start();
        return;
      }
      if (blocked) return;
      const candidate =
        [explicitHighlight.current, highlighted.current].find(
          (item) => item && filtered.includes(item),
        ) ?? filtered[0];
      if (candidate) pick(candidate);
    } else if (event.key === "Tab") {
      event.preventBaseUIHandler();
      const explicit = explicitHighlight.current;
      let candidate = explicit && filtered.includes(explicit) ? explicit : undefined;
      if (!candidate && searchable(listQuery ?? ""))
        candidate =
          [highlighted.current].find((item) => item && filtered.includes(item)) ?? filtered[0];
      if (confirmOnTab && openRef.current && candidate && !blocked) pick(candidate);
      else leave();
      onTab?.(event);
    }
  };
  return (
    <BaseCombobox.Root<ChoiceCandidate>
      items={items}
      filteredItems={filtered}
      filter={null}
      value={selected}
      inputValue={query ?? selected?.label ?? ""}
      open={open}
      autoHighlight
      itemToStringLabel={optionLabel}
      isItemEqualToValue={equalOption}
      onValueChange={(item, details) => {
        if (details.reason === "item-press" && item) pick(item);
      }}
      onInputValueChange={(next, details) => {
        if (details.reason !== "input-change" && details.reason !== "input-clear") return;
        operation.current++;
        setQuery(next);
        setListQuery(next);
        highlighted.current = undefined;
        explicitHighlight.current = undefined;
        onQueryChange?.();
        source.onSearch?.(next);
      }}
      onOpenChange={(next, details) => {
        if (next) {
          start(details.reason === "input-change");
          return;
        }
        if (
          containsErrorTarget?.(details.event.target) ||
          ("relatedTarget" in details.event &&
            containsErrorTarget?.(details.event.relatedTarget as EventTarget | null))
        ) {
          details.cancel();
          return;
        }
        if (details.reason === "input-clear") return;
        if (details.reason === "escape-key") close(true);
        else if (details.reason === "item-press") close(false);
        else leave();
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setListQuery(null);
      }}
      onItemHighlighted={(item, details) => {
        if (details.reason === "pointer") return;
        highlighted.current = item ?? undefined;
        if (details.reason === "keyboard") explicitHighlight.current = item ?? undefined;
      }}
    >
      <ComboboxParts.Input
        ref={inputRef}
        readOnly={editing === false}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-keyshortcuts={invalid ? "Alt+ArrowDown" : undefined}
        enterKeyHint="done"
        placeholder={config.placeholder}
        autoComplete="off"
        style={{ textAlign: "inherit" }}
        className={cn(
          INPUT_CLASS_NAME,
          ICON_INPUT_CLASS_NAME,
          (editing === false || (editing === undefined && !focused && !open && !showValue)) &&
            "astw:text-transparent",
          editing === false && "astw:cursor-pointer",
          invalid && CELL_ERROR_CLASS_NAME,
          inputClassName,
        )}
        onFocus={(event) => {
          const withinCell = focused || containsErrorTarget?.(event.relatedTarget);
          setFocused(true);
          onActiveChange?.(true);
          if (!withinCell) {
            onFocus?.();
            event.currentTarget.select();
          }
        }}
        onBlur={() => {
          setFocused(false);
          onActiveChange?.(openRef.current);
          if (!openRef.current) onLeave?.();
        }}
        onMouseDown={(event) => {
          if (event.button === 2 && editing === false) {
            event.preventDefault();
            return;
          }
          if (editing === false) start();
          if (!focused && editing !== undefined) selectOnMouseUp.current = true;
        }}
        onMouseUp={(event) => {
          if (selectOnMouseUp.current) {
            selectOnMouseUp.current = false;
            event.preventDefault();
          }
        }}
        onContextMenu={(event) => {
          if (editing) event.stopPropagation();
        }}
        onTouchStart={(event) => {
          if (editing) event.stopPropagation();
        }}
        onKeyDown={keyDown}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
      />
      <ComboboxParts.Content
        className="astw:w-max astw:min-w-(--anchor-width) astw:max-w-80"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        {source.loading && (
          <output className="astw:flex astw:items-center astw:gap-2 astw:px-3 astw:py-2 astw:text-body-sm">
            <Spinner />
            {t("loading")}
          </output>
        )}
        {source.failed && (
          <div className="astw:flex astw:items-center astw:gap-2 astw:px-3 astw:py-2 astw:text-body-sm">
            <span>{t("failed")}</span>
            <Button type="button" size="xs" variant="outline" onClick={source.retry}>
              {t("retry")}
            </Button>
          </div>
        )}
        {!blocked && <ComboboxParts.Empty>{emptyLabel ?? t("empty")}</ComboboxParts.Empty>}
        <ComboboxParts.List>
          {(item: ChoiceCandidate) => (
            <ComboboxParts.Item key={`${typeof item.value}:${item.value}`} value={item}>
              {renderOption ? (
                renderOption(item)
              ) : (
                <>
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="astw:text-muted-foreground">{item.description}</span>
                  )}
                </>
              )}
            </ComboboxParts.Item>
          )}
        </ComboboxParts.List>
        {nullOptionLabel === undefined && (
          <div className="astw:border-t astw:border-border astw:p-1">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                finish(onCommit(null));
              }}
            >
              {t("clear")}
            </Button>
          </div>
        )}
      </ComboboxParts.Content>
    </BaseCombobox.Root>
  );
}
