import * as React from "react";
import {
  ActionProvider,
  defineRegistry,
  Renderer,
  StateProvider,
  VisibilityProvider,
  type SetState,
  type StateStore,
} from "@json-render/react";

import { catalog } from "./catalog";
import { buildFormComponents } from "./form-components";

export type FormSpec = (typeof catalog)["_specType"];

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

  const stateRef = React.useRef<Record<string, unknown>>(
    (initialState ?? (spec as any).state ?? {}) as Record<string, unknown>,
  );
  const setStateRef = React.useRef<SetState | undefined>(undefined);

  const actionHandlers = React.useMemo(
    () =>
      handlers(
        () => setStateRef.current,
        () => stateRef.current,
      ),
    [handlers],
  );

  const validation = catalog.validate(spec);
  if (!validation.success) throw validation.error;

  return (
    <StateProvider store={store} initialState={initialState ?? (spec as any).state ?? {}}>
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers}>
          <Renderer spec={spec as any} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
