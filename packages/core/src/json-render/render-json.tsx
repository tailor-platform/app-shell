import * as React from "react";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, defineRegistry, Renderer, type StateStore } from "@json-render/react";

import { builtInFunctions } from "./built-in-functions";
import { catalog } from "./catalog";
import { buildFormComponents } from "./form-components";

// FormSpec is the typed spec inferred from the catalog.
// We intersect with `{ state?: Record<string, unknown> }` because the base
// react schema does not model the `state` field, but the Spec interface does.
export type FormSpec = (typeof catalog)["_specType"] & {
  state?: Record<string, unknown>;
};

export type RenderJSONProps = {
  /** json-render の React schema に準拠した JSON 構造 */
  spec: FormSpec;
  /** submit_form アクションが発火したとき、state.form (or state 全体) が渡る */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  /** spec.state の初期値を外から上書きしたい場合 */
  initialState?: Record<string, unknown>;
  /**
   * 外部 StateStore（controlled mode）。渡すと initialState は無視される。
   * `createStateStore` で生成し、コンポーネント外から state を読み書きできる。
   */
  store?: StateStore;
  /**
   * API レスポンスなどサーバーサイドエラーをフィールドへ注入する。
   * キーはフィールドの `name`、値はエラーメッセージ配列。
   */
  errors?: Record<string, string[]>;
};

export function RenderJSON({ spec, onSubmit, initialState, store, errors }: RenderJSONProps) {
  const onSubmitRef = React.useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const errorsRef = React.useRef(errors);
  errorsRef.current = errors;

  const { registry, handlers } = React.useMemo(
    () =>
      defineRegistry(catalog, {
        components: buildFormComponents(errorsRef),
        actions: {
          submit_form: async (_params, _setState, state) => {
            await onSubmitRef.current?.(
              ((state as Record<string, unknown>).form ?? state) as Record<string, unknown>,
            );
          },
        },
      }),
    [],
  );

  const actionHandlers = React.useMemo(
    () =>
      handlers(
        () => undefined,
        () => ({}),
      ),
    [handlers],
  );

  const validation = catalog.validate(spec);
  if (!validation.success) throw validation.error;

  return (
    <JSONUIProvider
      registry={registry}
      store={store}
      initialState={initialState ?? spec.state ?? {}}
      handlers={actionHandlers}
      functions={builtInFunctions}
    >
      <Renderer spec={spec as unknown as Spec} registry={registry} />
    </JSONUIProvider>
  );
}
