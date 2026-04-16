# JSON Render Integration — Design Spec

## 概要

AppShell のコンポーネント群を [json-render](https://json-render.dev/docs) の catalog/registry として公開し、JSON spec を渡すだけでフォームを描画できる `<RenderJSON>` コンポーネントを提供する。

---

## ファイル構成

```
packages/core/src/json-render/
  index.ts              ← 公開 API (RenderJSON, FormSpec, catalog)
  catalog.ts            ← defineCatalog — AI が使える語彙の定義
  form-components.tsx   ← catalog → AppShell コンポーネントのマッピング実装
  render-json.tsx       ← <RenderJSON> オーケストレーター
```

---

## 公開 API

`@tailor-platform/app-shell/json-render` (`src/json-render/index.ts`) からのエクスポート:

```ts
// すべて json-render エントリポイントのみからエクスポートする
// src/index.ts には追記しない
export { RenderJSON, type RenderJSONProps, type FormSpec } from "./render-json";
export { catalog } from "./catalog"; // サーバー側で catalog.prompt() に使う
```

---

## `<RenderJSON>` Props

```tsx
type RenderJSONProps = {
  /** json-render の React schema に準拠した JSON 構造 */
  spec: FormSpec;
  /** submit_form アクションが発火したとき、state.form (or state 全体) が渡る */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  /** spec.state の初期値を外から上書きしたい場合 */
  initialState?: Record<string, unknown>;
  /**
   * API レスポンスなどサーバーサイドエラーをフィールドへ注入する。
   * キーはフィールドの `name`、値はエラーメッセージ配列。
   * Form registry コンポーネントが AppShell `Form` の `errors` prop へ ref 経由で渡す。
   */
  errors?: Record<string, string[]>;
};
```

---

## Catalog 定義 (`catalog.ts`)

### Components

| catalog 名   | AppShell コンポーネント                                      | slots     | 主な props                                                                                                   |
| ------------ | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------ |
| `Form`       | `Form`                                                       | `default` | `title?: string`                                                                                             |
| `Card`       | `Card.Root` + `Card.Header` + `Card.Content`                 | `default` | `title?: string`, `description?: string`                                                                     |
| `Grid`       | `div` (CSS Grid / `grid-cols-{n}` クラス、新規実装)           | `default` | `cols` (1–6), `gap?` (none/sm/md/lg)                                                                         |
| `Fieldset`   | `Fieldset.Root` + `Fieldset.Legend`                          | `default` | `legend?: string`, `disabled?: boolean`                                                                      |
| `TextField`       | `Field.Root` + `Field.Label` + `Input` + `Field.Error`                  | —         | `name`, `label`, `type?`, `placeholder?`, `description?`, `required?`, `disabled?`, `value`, `min?`, `max?`, `minLength?`, `maxLength?`, `pattern?` |
| `SelectField`     | `Field.Root` + `Field.Label` + `Select` + `Field.Error`                 | —         | `name`, `label`, `options[]`, `placeholder?`, `description?`, `required?`, `disabled?`, `value`                   |
| `CheckboxField`   | `Field.Root` + `Field.Label` + `Checkbox` + `Field.Error` (新規実装)    | —         | `name`, `label`, `description?`, `required?`, `disabled?`, `checked`                                              |
| `RadioGroupField` | `Field.Root` + `Field.Label` + `RadioGroup` + `Field.Error` (新規実装)  | —         | `name`, `label`, `options[]`, `description?`, `required?`, `disabled?`, `value`                                   |

### Actions

| action 名     | 用途                                    | params |
| ------------- | --------------------------------------- | ------ |
| `submit_form` | フォーム送信。state を `onSubmit` へ渡す | `{}`   |

### Zod スキーマ例

```ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Form: {
      props: z.object({ title: z.string().nullable() }),
      slots: ["default"],
      description: "Root form container",
    },
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
      }),
      slots: ["default"],
      description: "Bordered card for grouping a region of the form",
    },
    Grid: {
      props: z.object({
        cols: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
      }),
      slots: ["default"],
      description: "CSS Grid layout container. Use to place multiple fields side by side.",
    },
    Fieldset: {
      props: z.object({
        legend: z.string().nullable(),
        disabled: z.boolean().nullable(),
      }),
      slots: ["default"],
      description: "Groups related fields with an accessible legend",
    },
    TextField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(["text", "email", "password", "number", "tel"]).nullable(),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: z.string().nullable(), // $bindState 対応
        min: z.number().nullable(),
        max: z.number().nullable(),
        minLength: z.number().nullable(),
        maxLength: z.number().nullable(),
        pattern: z.string().nullable(),
      }),
      description: "Labeled text input field with validation",
    },
    SelectField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string() })),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: z.string().nullable(), // $bindState 対応
      }),
      description: "Labeled select/combobox field with options",
    },
    CheckboxField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        checked: z.boolean().nullable(), // $bindState 対応
      }),
      description: "Labeled checkbox field",
    },
    RadioGroupField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string() })),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: z.string().nullable(), // $bindState 対応
      }),
      description: "Labeled radio group field",
    },
  },
  actions: {
    submit_form: {
      params: z.object({}),
      description: "Submit the form and pass current state to onSubmit handler",
    },
  },
});
```

---

## `<RenderJSON>` 内部構造 (`render-json.tsx`)

- `defineRegistry` は `useMemo([])` で一度だけ生成し、安定した registry を保証する。
- `onSubmit` / `errors` は `useRef` 経由で参照することで、props 変化時も最新値を使う。
- `submit_form` action は `state.form` を優先し、なければ `state` 全体を `onSubmit` へ渡す。
- `errors` は `Form` registry コンポーネントへ ref 経由で流し、AppShell `Form` の `errors` prop に渡す。
- spec は `validateSpec` で検証し、invalid な場合はそのままランタイムエラーとして throw する（フォールバック UI は提供しない）。
- フィールドの条件付き表示は json-render の [`visibility`](https://json-render.dev/docs/visibility) 機能（要素の `visible` プロパティ）をそのまま使用する。`onStateChange` は提供しない。

```tsx
function RenderJSON({ spec, onSubmit, initialState, errors }: RenderJSONProps) {
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  const { registry, handlers } = useMemo(
    () =>
      defineRegistry(catalog, {
        // formComponents に errorsRef を渡し、Form registry コンポーネントが
        // AppShell Form の errors prop へ反映する
        components: buildFormComponents(errorsRef),
        actions: {
          submit_form: async (_params, _setState, state) => {
            await onSubmitRef.current?.(
              (state as Record<string, unknown>).form ??
              (state as Record<string, unknown>),
            );
          },
        },
      }),
    [],
  );

  const stateRef = useRef(initialState ?? spec.state ?? {});
  const setStateRef = useRef<(fn: unknown) => void>(() => {});

  const actionHandlers = useMemo(
    () => handlers(() => setStateRef.current, () => stateRef.current),
    [],
  );

  // spec を catalog.validate() で検証し、invalid な場合は runtime error として throw する
  const validation = catalog.validate(spec);
  if (!validation.success) throw validation.error;

  return (
    <StateProvider initialState={initialState ?? spec.state ?? {}}>
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
```

---

## State / Binding の流れ

```json
{
  "root": "form-1",
  "state": { "form": { "name": "", "role": null } },
  "elements": {
    "form-1": {
      "type": "Form",
      "props": { "title": "New User" },
      "children": ["name-field", "role-field"]
    },
    "name-field": {
      "type": "TextField",
      "props": {
        "name": "name",
        "label": "Name",
        "value": { "$bindState": "/form/name" }
      },
      "children": []
    },
    "role-field": {
      "type": "SelectField",
      "props": {
        "name": "role",
        "label": "Role",
        "options": [
          { "label": "Admin", "value": "admin" },
          { "label": "Member", "value": "member" }
        ],
        "value": { "$bindState": "/form/role" }
      },
      "children": []
    }
  }
}
```

---

## 新規実装が必要な AppShell コンポーネント

以下は AppShell にまだ存在せず、`src/components/` への追加実装が必要なもの。
Base UI (`@base-ui/react`) に対応するプリミティブが存在するため、他のコンポーネントと同じラッピングパターンで実装できる。

| コンポーネント | Base UI プリミティブ | 備考 |
| --- | --- | --- |
| `Checkbox` (+ `Field` 統合) | `@base-ui/react/checkbox` | `Field.Root` 内で使えるよう Base UI の context に接続する |
| `RadioGroup` + `Radio` (+ `Field` 統合) | `@base-ui/react/radio-group` | `RadioGroup.Root` > `Radio.Root` の compound component |
| `Grid` | なし (純粋な div wrapper) | `grid grid-cols-{n}` と gap クラスを出力するだけ |

---

## 追加が必要な依存パッケージ

| パッケージ            | 用途                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `@json-render/core`   | `defineCatalog` (`catalog.validate()` / `catalog.prompt()` を含む) |
| `@json-render/react`  | `defineRegistry`, `Renderer`, `StateProvider`, `VisibilityProvider`, `ActionProvider`, `useBoundProp` |
| `zod`                 | catalog の props スキーマ定義                                     |

---

## TypeScript 型

```ts
// json-render の React schema から spec 型を取る
import type { InferSpec } from "@json-render/react";
import type { catalog } from "./catalog";

export type FormSpec = InferSpec<typeof catalog>;
```

---

## State パス規約

spec 内の全フォーム値は **`/form/*`** 配下に配置する規約とする。

- フィールドの `value` / `checked` は `{ "$bindState": "/form/<fieldName>" }` と記述する
- `submit_form` action は `state.form` を `onSubmit` へ渡す（`/form` キーが存在しない場合は `state` 全体）
- AI への `catalog.prompt()` にも `customRules` としてこの規約を渡す

```ts
const systemPrompt = catalog.prompt({
  customRules: [
    'Always bind field values under /form/* (e.g. { "$bindState": "/form/email" })',
    "Always initialize spec.state.form as an object with the form's default values",
  ],
});
```

---

## エントリポイントの分離

`@json-render/core` と `@json-render/react` は json-render を使わないアプリにバンドルコストを乗せないため、独立エントリポイントとして分離する。

`packages/core/vite.config.ts` の `entry` への追記:

```ts
entry: {
  "app-shell": "src/index.ts",
  "vite-plugin": "src/vite-plugin.ts",
  "json-render": "src/json-render/index.ts",  // 追加
},
```

`packages/core/package.json` の `exports` への追記:

```json
"./json-render": {
  "types": "./dist/json-render.d.ts",
  "default": "./dist/json-render.js"
}
```

利用側は `@tailor-platform/app-shell/json-render` からインポートする。`src/index.ts` には追記しない。

---

## spec 差し替えと再マウント

`StateProvider` は初期状態をマウント時にのみ評価する。`spec` や `initialState` が外から差し替わっても内部 state はリセットされない。

AI がストリーミングで spec を都度更新するなど、spec の変更に合わせて state を初期化したい場合は、利用側が `key` prop で再マウントする責務を持つ。

```tsx
<RenderJSON key={specVersion} spec={spec} onSubmit={handleSubmit} />
```

---

## `zod` の依存関係

`catalog.ts` で Zod スキーマを定義するため `zod` が必要。`@json-render/core` が内部で re-export しているかをインストール時に確認し、していなければ `packages/core/package.json` の `dependencies` に追加する。

```bash
pnpm add zod --filter @tailor-platform/app-shell
```

---

## 今後の拡張候補

- `TextareaField` — 複数行テキスト入力
- `SwitchField` — トグルスイッチ
- `DateField` — 日付入力
- `ComboboxField` — 自由入力付きコンボボックス (AppShell の `Combobox` を使用)
