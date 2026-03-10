---
"@tailor-platform/app-shell": major
---

Unify layout APIs around the composition-only `Layout` + `LayoutHeader` pattern and remove prop-based layout variants.
`Layout` now accepts only `className` at the container level; header/title/actions are handled by `LayoutHeader`, and side column sizing is controlled via slot `className`.

Before:
```tsx
<Layout columns={2} title="Edit" actions={[<Button key="save">Save</Button>]}>
  <Layout.Column><Form /></Layout.Column>
  <Layout.Column><Aside /></Layout.Column>
</Layout>
```

After:
```tsx
<>
  <LayoutHeader title="Edit" actions={<Button>Save</Button>} />
  <Layout className="gap-6">
    <Layout.Main><Form /></Layout.Main>
    <Layout.Right className="w-[360px]"><Aside /></Layout.Right>
  </Layout>
</>
```

