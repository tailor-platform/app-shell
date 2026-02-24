# Base UI Migration Plan

shadcn/ui + Radix UI から Base UI への移行計画

## 概要

AppShellで使用しているshadcn/ui (Radix UIベース) を廃止し、Base UIに移行する。

### 技術方針

| 項目 | 決定 |
|------|------|
| スタイリング | **Tailwind CSS継続** (コンポーネント内にインライン記述) |
| アニメーション | **tw-animate-css継続** (data属性のみ変更) |

---

## 現状分析

### 使用中のRadix UIパッケージ

| パッケージ | 使用箇所 | Base UI対応 |
|-----------|---------|-------------|
| `@radix-ui/react-slot` | Button, Sidebar, Breadcrumb | ❌ なし (自前実装 or render prop) |
| `@radix-ui/react-dialog` | Dialog, Sheet | ✅ Dialog |
| `@radix-ui/react-tooltip` | Tooltip | ✅ Tooltip |
| `@radix-ui/react-collapsible` | Collapsible | ✅ Collapsible |
| `@radix-ui/react-separator` | Separator | ❌ なし (自前実装へ移行) |
| `@radix-ui/react-checkbox` | **未使用** → 削除可 | ✅ Checkbox |
| `@radix-ui/react-dropdown-menu` | **未使用** → 削除可 | ✅ Menu |
| `@radix-ui/react-label` | **未使用** → 削除可 | ❌ なし |
| `@radix-ui/react-popover` | **未使用** → 削除可 | ✅ Popover |
| `@radix-ui/react-navigation-menu` | **未使用** → 削除可 | ❌ なし |

### shadcn/ui由来コンポーネント (14個)

```
components/ui/
├── badge.tsx
├── breadcrumb.tsx
├── button.tsx
├── client-side-link.tsx
├── collapsible.tsx
├── dialog.tsx
├── input.tsx
├── separator.tsx
├── sheet.tsx
├── sidebar.tsx (800行)
├── skeleton.tsx
├── sonner.tsx
├── table.tsx
└── tooltip.tsx
```

---

## Data属性の変換ルール

Base UIはRadix UIと異なるdata属性を使用する。

### マッピング表

| Radix UI | Base UI | 備考 |
|----------|---------|------|
| `data-[state=open]` | `data-open` | 値なしのシンプルな属性 |
| `data-[state=closed]` | `data-closed` | 値なしのシンプルな属性 |
| `data-[side=top/right/bottom/left]` | `data-side` | 値あり (同じ形式) |
| - | `data-starting-style` | 🆕 アニメーション開始時 |
| - | `data-ending-style` | 🆕 アニメーション終了時 |
| `data-[active=true]` | `data-popup-open` | 要変換 |

### 変換例

```tsx
// Before (Radix UI)
"astw:data-[state=open]:animate-in astw:data-[state=closed]:fade-out-0"

// After (Base UI)
"astw:data-open:animate-in astw:data-ending-style:fade-out-0"
```

---

## アニメーション戦略

### tw-animate-css継続の理由

| 観点 | tw-animate-css | Base UIネイティブ |
|------|----------------|-------------------|
| 仕組み | `animate-in`/`animate-out` クラス | CSS transition + `data-*-style` |
| 途中キャンセル | ❌ CSS animationは途中キャンセル不可 | ✅ CSS transitionは途中でスムーズに反転 |
| 変更量 | data属性の変更のみ | 全アニメーションの書き換え |

**決定**: tw-animate-cssを継続し、発火条件のdata属性のみ変更する。

### 必要な変更

1. `data-[state=open]:animate-in` → `data-open:animate-in`
2. `data-[state=closed]:animate-out` → `data-ending-style:animate-out` または `data-closed:animate-out`

---

## APIの違い

### asChild パターンの変更

Radix UIの `asChild` + `Slot` パターンは、Base UIでは `render` prop に置き換わる。

```tsx
// Before (Radix UI)
<Button asChild>
  <Link to="/">Home</Link>
</Button>

// After (Base UI)
<Button render={<Link to="/" />}>
  Home
</Button>
```

### 自前Slot実装

Base UIにはSlotがないため、asChildパターンを維持する場合は自前実装が必要。

---

## 移行フェーズ

### Phase 1: 準備

- [ ] 未使用Radix UIパッケージの削除確認
- [ ] `@base-ui-components/react` インストール
- [ ] `Slot` の自前実装 (asChild → render prop変換用ユーティリティ)

### Phase 2: 低リスクコンポーネント

- [ ] `tooltip.tsx` → Base UI Tooltip
  - `--radix-tooltip-content-transform-origin` CSS変数の対応が必要
- [ ] `collapsible.tsx` → Base UI Collapsible
  - `sidenav-layout.tsx` の `data-[state=open]:rotate-90` も更新
- [ ] `separator.tsx` → シンプルな `<div>` / `<hr>` 実装
  - 現在 `@radix-ui/react-separator` を使用中 (移行計画で見落としていた)

### Phase 3: Dialog系

- [ ] `dialog.tsx` → Base UI Dialog
- [ ] `sheet.tsx` → Base UI Dialog (side variant)
- [ ] data属性セレクタの書き換え
- [ ] アニメーションの動作確認

### Phase 4: Button & Sidebar

- [ ] `button.tsx` → asChildパターンの置き換え (render prop or 自前Slot)
- [ ] `breadcrumb.tsx` → 同上
- [ ] `sidebar.tsx` → 依存コンポーネント移行後に対応 (800行の大型コンポーネント)

### Phase 5: クリーンアップ

- [ ] 全Radix UI依存の削除
- [ ] package.jsonからRadix UIパッケージ削除
- [ ] テスト・E2E検証
- [ ] ドキュメント更新

---

## リスクと対策

### 高リスク: Sidebarコンポーネント

- 800行の大型コンポーネント
- Sheet, Tooltip, Slotに依存
- **対策**: Phase 2-3の完了後、十分なテストを経てから着手

### 中リスク: 外部APIの互換性

- `Dialog`, `Sheet` 等のpropsが変わる可能性
- **対策**: できるだけ現在のAPIを維持するラッパーを作成

### 低リスク: アニメーション

- tw-animate-css継続でリスク最小化
- **対策**: data属性の変更のみに留める

---

---

## 実装計画 (詳細)

### Step 1: 未使用パッケージの削除

```bash
pnpm remove @radix-ui/react-checkbox @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-navigation-menu
```

### Step 2: Separator の自前実装

**現状**: `@radix-ui/react-separator` を使用  
**移行先**: シンプルな `<div>` コンポーネント

```tsx
// Before
import * as SeparatorPrimitive from "@radix-ui/react-separator";
<SeparatorPrimitive.Root orientation={orientation} ... />

// After
function Separator({ orientation = "horizontal", ... }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-orientation={orientation}
      className={cn(
        "astw:bg-border astw:shrink-0",
        orientation === "horizontal" 
          ? "astw:h-px astw:w-full" 
          : "astw:h-full astw:w-px",
        className
      )}
      {...props}
    />
  );
}
```

### Step 3: Tooltip の移行

**変更点**:
1. `@radix-ui/react-tooltip` → `@base-ui-components/react` の Tooltip
2. `asChild` → `render` prop パターン
3. CSS変数 `--radix-tooltip-content-transform-origin` の対応

```tsx
// Before (Radix)
<TooltipTrigger asChild>
  <button>Hover me</button>
</TooltipTrigger>

// After (Base UI)
<Tooltip.Trigger render={<button />}>
  Hover me
</Tooltip.Trigger>
```

### Step 4: Collapsible の移行

**変更点**:
1. data属性: `data-[state=open]` → `data-open`
2. `sidenav-layout.tsx` 内のスタイルも更新

```tsx
// Before
"astw:data-[state=open]:rotate-90"

// After  
"astw:data-open:rotate-90"
```

### Step 5: Dialog / Sheet の移行

**変更点**:
1. `@radix-ui/react-dialog` → `@base-ui-components/react` の Dialog
2. data属性の書き換え (多数)
3. アニメーション発火条件の更新

**影響範囲**:
- `dialog.tsx` (直接使用)
- `sheet.tsx` (Dialog を Side variant として使用)
- `sidebar.tsx` (Sheet を内部で使用)

### Step 6: Button / Breadcrumb の移行

**asChild パターンの置き換え**:

Option A: render prop に移行
```tsx
// Before
<Button asChild><Link to="/">Home</Link></Button>

// After
<Button render={<Link to="/" />}>Home</Button>
```

Option B: 自前 Slot 実装で asChild を維持
```tsx
// Slot.tsx (新規作成)
import { cloneElement, isValidElement } from "react";

export function Slot({ children, ...props }) {
  if (!isValidElement(children)) return null;
  return cloneElement(children, { ...props, ...children.props });
}
```

### Step 7: Sidebar の移行

**依存関係** (先に移行が必要):
- Sheet (Dialog)
- Tooltip  
- Slot (asChild)

**作業量**: 800行の大型コンポーネント、慎重に進める

---

## 追加の注意事項

### table.tsx の data-[state=selected]

これは Radix UI 由来ではなく、自前の状態管理用。  
移行対象外だが、Base UI のパターンに合わせて `data-selected` に統一することを検討。

### 公開APIについて

現在、Dialog/Sheet/Separator は `index.ts` で export されておらず内部使用のみ。  
移行時の破壊的変更リスクは低い。

---

## 参考リンク

- [Base UI Documentation](https://base-ui.com/)
- [Base UI Styling Guide](https://base-ui.com/react/handbook/styling)
- [Base UI Animation Guide](https://base-ui.com/react/handbook/animation)
