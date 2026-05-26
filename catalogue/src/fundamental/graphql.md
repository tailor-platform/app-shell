# GraphQL Conventions

Type-safe GraphQL via `gql.tada`. The frontend never hand-writes types — generated bindings come from `pnpm generate` (step 2 of the workflow) reading the deployed backend schema.

## Setup

Every GraphQL-aware module imports from the local `@/graphql` barrel:

```ts
import { graphql, type FragmentOf, readFragment } from "@/graphql";
```

`@/graphql` is generated. Don't import `gql` from `urql` or `gql.tada` directly — go through the barrel so types stay coherent.

The urql client is wired in `App.tsx` (see [project-setup.md](project-setup.md)). Pages don't construct their own client.

## Built-in operations vs custom resolvers

The Tailor Platform auto-generates per-entity queries when the resolver doc opts in via `gqlOperations: "query"`:

- `<entity>(id: ID!)` — get one
- `<entities>` — list, returned as a connection (`edges { node { ... } }`, plus `pageInfo`)

Mutations are always custom — they come from resolver docs (Tier 3) and live in `backend/src/resolvers/`. The generated types appear in `@/graphql` after `pnpm generate`.

## Fragment collocation

**Each component owns its fragment.** The parent page imports the fragment and composes it into the page query. This is the single most important GraphQL convention in this skill.

```tsx
// components/order-summary.tsx
import { graphql, type FragmentOf, readFragment } from "@/graphql";

export const OrderSummaryFragment = graphql(`
  fragment OrderSummary on Order {
    id
    number
    status
    total
  }
`);

export const OrderSummary = ({ order }: { order: FragmentOf<typeof OrderSummaryFragment> }) => {
  const data = readFragment(OrderSummaryFragment, order);
  return (
    <div>
      {data.number} — {data.status}
    </div>
  );
};
```

```tsx
// pages/orders/[id]/page.tsx
import { graphql } from "@/graphql";
import { OrderSummary, OrderSummaryFragment } from "@/components/order-summary";

const OrderQuery = graphql(
  `
    query Order($id: ID!) {
      order(id: $id) {
        ...OrderSummary
      }
    }
  `,
  [OrderSummaryFragment],
);
```

Rules:

- Each component file exports `<Name>Fragment` alongside the component.
- The component's prop type is `FragmentOf<typeof <Name>Fragment>`. Always call `readFragment(<Name>Fragment, prop)` once to read it.
- The parent's query lists the fragment in the second `graphql(...)` argument (the dependency array). Forgetting the dep array works at runtime but loses type narrowing.
- Don't pass raw fields between components — pass the fragment value. This keeps types and queries in lockstep.

## Connection pattern (lists)

Built-in `<entities>` queries return a connection. Use `edges { node { ... } }`:

```tsx
const OrdersQuery = graphql(
  `
    query Orders($first: Int, $after: String) {
      orders(first: $first, after: $after) {
        edges {
          node {
            ...OrderSummary
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  [OrderSummaryFragment],
);

const [{ data }] = useQuery({ query: OrdersQuery, variables: { first: 25 } });
const orders = data?.orders.edges.map((e) => e.node) ?? [];
```

For `pnpm gql-tada:check` to pass, always destructure with optional chaining and provide a fallback (`?? []`).

### Wiring to `DataTable` (sort, filters, pagination)

For **standard list pages**, do not hand-roll only `first` / `after`. Compose AppShell **`DataTable`** + **`useCollectionVariables`** + **`useDataTable`**: derive query variables from `variables.pagination`, `variables.query`, `variables.order`, map `edges` / `pageInfo` / `total` into `useDataTable`’s `data`. See **`patterns/list/dense-scan.md`** and **`components.md` → DataTable**.

When `@tailor-platform/app-shell-sdk-plugin` codegen is enabled, pass generated **`tableMetadata`** into **`useCollectionVariables`** so `variables.query` / `variables.order` are typed against your Tailor GraphQL inputs (upstream **data-table.md** Typed query variables).

## Mutations and cache invalidation

Mutations from custom resolvers appear in `@/graphql` after `pnpm generate`:

```tsx
import { useMutation } from "urql";
import { graphql } from "@/graphql";
import { useToast } from "@tailor-platform/app-shell";

const CreateOrderMutation = graphql(`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      number
    }
  }
`);

function CreateOrderButton() {
  const toast = useToast();
  const [{ fetching }, createOrder] = useMutation(CreateOrderMutation);

  const handleSubmit = async (input: CreateOrderInput) => {
    const result = await createOrder({ input });
    if (result.error) {
      toast.error(`Failed to create order: ${result.error.message}`);
      return;
    }
    toast.success(`Order ${result.data!.createOrder.number} created`);
  };
  // ...
}
```

### `additionalTypenames`

When a mutation creates/updates/deletes an entity that another query already has cached, urql won't know to refetch unless you pass `additionalTypenames`. Use it on **both** the query and the mutation when they share a typename:

```tsx
// Query side — declares it cares about the Order typename
const [{ data }] = useQuery({
  query: OrdersQuery,
  variables: { first: 25 },
  context: { additionalTypenames: ["Order"] },
});

// Mutation side — declares it produces Order writes
const [, createOrder] = useMutation(CreateOrderMutation);
await createOrder(
  { input },
  { additionalTypenames: ["Order"] }, // triggers refetch of any query subscribed to 'Order'
);
```

Skip `additionalTypenames` only when the mutation's return type already includes the affected entity _and_ every cached query for it touched the same `id` — urql will then refresh by id. When in doubt, add it.

### Optimistic updates

Use sparingly — only for actions that:

1. Are reversible (rollback is cheap on error)
2. The user expects to feel instant (toggling a flag, reordering a list)

Prefer plain pending-state UI (button spinner) for everything else. See `interaction/toast.md` and `interaction/confirm.md` for feedback patterns.

## Page conventions

Every page component:

1. Is the **default export** of `page.tsx` (or `index.tsx` depending on routing convention — match siblings in `src/pages/`).
2. Sets `appShellPageProps` with at least `meta.title`:

   ```tsx
   export default function OrdersListPage() {
     /* ... */
   }
   OrdersListPage.appShellPageProps = {
     meta: { title: "Orders" },
   };
   ```

3. Uses `appShellPageProps.guards` for permission gates and `appShellPageProps.loader` for route loaders. See [project-setup.md](project-setup.md).

## Quick reference

| Concern                                        | Answer                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Where do generated types come from?            | `@/graphql` barrel, populated by `pnpm generate`                                                              |
| How do I add a field to a card?                | Add it to the component's fragment, not the page query                                                        |
| Why isn't my list refreshing after a mutation? | Add `additionalTypenames: ['<Type>']` on both query and mutation                                              |
| Connection vs array?                           | Always connection (`edges { node }`) for built-in `<entities>` queries; check the schema for custom resolvers |
| Pagination / sort / toolbar filters together?  | `useCollectionVariables` + `DataTable`; see § **Wiring to `DataTable`** above                                 |
| Where's the urql client configured?            | `App.tsx` — see `project-setup.md`                                                                            |
