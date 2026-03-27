# DataTable 移植計画

`tailor-data-viewer` の DataTable 関連コンポーネント・hooks・型を `@tailor-platform/app-shell` (`packages/core`) に移植する。

ソースリポジトリ: https://github.com/tailor-sandbox/tailor-data-viewer

## スコープ

### 移植対象

`packages/data-viewer/src/component/` 配下のすべてのコンポーネント、hooks、型定義。

### スコープ外

- `generator/metadata-generator.ts` — Tailor Platform SDK 依存のためapp-shellには含めない。別パッケージとして維持し、`TableMetadata` 等の型インターフェースのみ app-shell 側に定義する。
- `styles/theme.css` — app-shell 既存のテーマ（CSS変数 + Tailwind）を使用するため不要。

## ファイルマッピング

| ソース (tailor-data-viewer) | 移植先 (packages/core/src/) | 備考 |
|---|---|---|
| `component/types.ts` | `components/data-table/types.ts` | generator への import を除去し、`TableMetadata` 等の型を自己完結で定義 |
| `component/lib/utils.ts` | — | app-shell 既存の `@/lib/utils` の `cn()` を使用 |
| `component/table.tsx` | — | app-shell 既存の `Table` コンポーネントを使用 |
| `component/collection/use-collection.ts` | `hooks/use-collection-variables.ts` | DataTable 以外でも単体利用可能 |
| `component/collection/use-collection.test.ts` | `hooks/use-collection-variables.test.ts` | |
| `component/collection/use-collection.typetest.ts` | `hooks/use-collection-variables.typetest.ts` | |
| `component/collection/collection-provider.tsx` | `hooks/collection-variables-provider.tsx` | hook と同居 |
| `component/data-table/data-table.tsx` | `components/data-table/data-table.tsx` | 内部の `Table.*` 参照を app-shell の Table に差し替え |
| `component/data-table/data-table-context.tsx` | `components/data-table/data-table-context.tsx` | |
| `component/data-table/use-data-table.ts` | `components/data-table/use-data-table.ts` | |
| `component/data-table/pagination.tsx` | `components/data-table/pagination.tsx` | |
| `component/data-table/column-selector.tsx` | `components/data-table/column-selector.tsx` | |
| `component/data-table/csv-button.tsx` | `components/data-table/csv-button.tsx` | |
| `component/data-table/search-filter-form.tsx` | `components/data-table/search-filter-form.tsx` | |
| `component/data-table/i18n.ts` | `components/data-table/i18n.ts` | |
| `component/field-helpers.ts` | `components/data-table/field-helpers.ts` | |
| `component/field-helpers.test.ts` | `components/data-table/field-helpers.test.ts` | |
| `component/table.test.tsx` | `components/data-table/data-table.test.tsx` | |
| `component/data-table/column-selector.test.tsx` | `components/data-table/column-selector.test.tsx` | |
| `component/data-table/csv-button.test.tsx` | `components/data-table/csv-button.test.tsx` | |
| `component/index.ts` | `components/data-table/index.ts` | public exports のみ |

## 最終的なディレクトリ構成

```
packages/core/src/
  hooks/
    use-collection-variables.ts             # useCollectionVariables hook（単体利用可能）
    use-collection-variables.test.ts        # useCollectionVariables テスト
    use-collection-variables.typetest.ts    # 型テスト
    collection-variables-provider.tsx       # CollectionVariablesProvider + useCollectionVariablesContext
  components/
    data-table/
      index.ts                              # public exports
      types.ts                              # 型定義（TableMetadata 含む）
      data-table.tsx                        # DataTable compound component
      data-table.test.tsx                   # DataTable テスト
      data-table-context.tsx                # DataTableContext + useDataTableContext
      use-data-table.ts                     # useDataTable hook
      pagination.tsx                        # Pagination component
      column-selector.tsx                   # ColumnSelector component
      column-selector.test.tsx              # ColumnSelector テスト
      csv-button.tsx                        # CsvButton component
      csv-button.test.tsx                   # CsvButton テスト
      search-filter-form.tsx                # SearchFilterForm component
      field-helpers.ts                      # createColumnHelper, inferColumns
      field-helpers.test.ts                 # field-helpers テスト
      i18n.ts                               # DataTable ロケールラベル（defineI18nLabels 使用）
```

## 作業ステップ

### Phase 1: 型定義の移植と整理

1. `types.ts` を移植する
   - `generator/metadata-generator.ts` からの import を除去
   - `FieldType`, `FieldMetadata`, `TableMetadata`, `TableMetadataMap` の型定義を `types.ts` 内に移動
   - metadata 依存型（`BuildQueryVariables`, `TableMetadataFilter`, `MetadataFilter`, `TableFieldName`, `TableOrderableFieldName` 等）もすべて `types.ts` 内で自己完結させる
   - ランタイム定数 (`OPERATORS_BY_FILTER_TYPE`, `DEFAULT_OPERATOR_LABELS`, `fieldTypeToSortConfig`, `fieldTypeToFilterConfig`) もそのまま移植

### Phase 2: hooks の移植

2. `useCollectionVariables` hook を移植する
   - `@/lib/utils` の `cn` を使用するよう import を変更
   - `../generator/metadata-generator` への参照を `./types` に変更
3. `CollectionVariablesProvider` を移植する
4. `useDataTable` hook を移植する
5. `DataTableContext` を移植する

### Phase 3: コンポーネントの移植

6. `DataTable` compound component を移植する
   - 内部の `Table.*` 参照を app-shell 既存の `Table` コンポーネントにマッピング:
     - `Table.Headers` → `Table.Header`
     - `Table.HeaderRow` → `Table.Row`
     - `Table.HeaderCell` → `Table.Head`
     - `Table.Body`, `Table.Row`, `Table.Cell` → そのまま（名前一致）
   - `Table.Root` は app-shell 版を使用（`tableLayout` prop は不要、削除）
7. `Pagination` を移植する
8. `ColumnSelector` を移植する
9. `CsvButton` を移植する
10. `SearchFilterForm` を移植する
11. `i18n.ts` を移植する
12. `field-helpers.ts` (`createColumnHelper`, `inferColumns`) を移植する

### Phase 4: スタイリングの app-shell 規約への適合

13. 全 Tailwind クラスに `astw:` プレフィックスを付与する
    - 例: `"w-full text-sm"` → `"astw:w-full astw:text-sm"`
    - `cn()` の引数内の全クラスが対象
14. 全コンポーネントのルート要素に `data-slot` 属性を追加する
    - 例: `data-slot="data-table"`, `data-slot="pagination"`, `data-slot="column-selector"` 等
15. 全サブコンポーネントに `displayName` を設定する
    - 例: `DataTableRoot.displayName = "DataTable.Root"`

### Phase 5: public API のエクスポート

16. `components/data-table/index.ts` を作成する—以下をエクスポート:
    - `DataTable` (compound namespace)
    - `useDataTable`, `useDataTableContext`
    - `useCollectionVariables`, `CollectionVariablesProvider`, `useCollectionVariablesContext`
    - `createColumnHelper`
    - `Pagination`, `ColumnSelector`, `CsvButton`, `SearchFilterForm`
    - 必要最小限の型のみ（`Column`, `ColumnOptions`, `SortConfig`, `FilterConfig`, `CollectionResult`, `NodeType`, `UseCollectionReturn`, `UseDataTableReturn` 等）
17. `packages/core/src/index.ts` に `data-table/index.ts` からの re-export を追加する

### Phase 6: テスト

18. 既存テストを移植・修正する
    - import パスの変更
    - `astw:` プレフィックス付きクラスに合わせた snapshot 更新
    - app-shell の vitest 設定に合わせた調整
19. 全テストが pass することを確認する

### Phase 7: 品質チェック

20. `pnpm type-check` — 型エラーがないことを確認
21. `pnpm lint` — lint エラーがないことを確認
22. `pnpm test` — 全テスト pass を確認
23. `pnpm fmt` — フォーマット統一

## 設計判断

| 論点 | 決定 | 理由 |
|---|---|---|
| **`generator/` の扱い** | `@tailor-platform/app-shell-sdk-plugins` として別パッケージ化 | Tailor SDK への依存があり、app-shell のスコープ外。新パッケージとしてモノレポに追加 |
| **metadata 型の扱い** | `types.ts` にインターフェースとして定義 | generator が同じ型に準拠する形にし、import の循環を避ける |
| **i18n の統合** | app-shell の `defineI18nLabels` に統合 | `useT()` で `AppShellConfig.locale` から自動解決。`locale` prop は削除。AppShell 外での standalone 利用は不要 |
| **既存 Table との関係** | DataTable 内部で app-shell の `Table` を使用 | 重複を避け、テーマ整合性を保つ |
| **ディレクトリ構造** | `components/data-table/` ディレクトリ (Pattern C) | ファイル数が多く、フラット配置は不適切 |
| **`useCollectionVariables` の配置** | `hooks/use-collection-variables.ts` に分離 | DataTable 以外の UI パターン（kanban 等）でも単体利用を想定 |

## Table コンポーネントのサブコンポーネント名マッピング

data-viewer の `DataTable` 内部で使用されている `Table.*` と app-shell 既存 `Table.*` の対応:

| data-viewer (`Table.*`) | app-shell (`Table.*`) |
|---|---|
| `Table.Root` | `Table.Root` |
| `Table.Headers` | `Table.Header` |
| `Table.HeaderRow` | `Table.Row` |
| `Table.HeaderCell` | `Table.Head` |
| `Table.Body` | `Table.Body` |
| `Table.Row` | `Table.Row` |
| `Table.Cell` | `Table.Cell` |

## 依存関係

追加パッケージ: なし（`cn`, `clsx`, `tailwind-merge` は既存）

## 補足: generator パッケージとの関係

移植後、`@tailor-platform/app-shell` は `TableMetadata` インターフェースを export する。`@tailor-platform/app-shell-sdk-plugins` パッケージ（モノレポ内 `packages/sdk-plugins`）が generator を含み、この型に準拠するメタデータを生成する。
