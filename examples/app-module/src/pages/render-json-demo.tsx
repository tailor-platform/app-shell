import { defineResource, Layout, Card, Button, Dialog } from "@tailor-platform/app-shell";
import {
  RenderJSON,
  createStateStore,
  type FormSpec,
} from "@tailor-platform/app-shell/json-render";
import * as React from "react";

// ─── Spec 1: New User ────────────────────────────────────────────────────────

const newUserSpec: FormSpec = {
  root: "form-1",
  state: {
    form: {
      name: "",
      email: "",
      role: null,
      plan: null,
      agree: false,
    },
  },
  elements: {
    "form-1": {
      type: "Form",
      props: { title: "New User" },
      visible: true,
      children: ["personal-card", "role-card", "agree-field"],
    },
    "personal-card": {
      type: "Card",
      props: {
        title: "Personal Information",
        description: "Basic contact details for the new user.",
      },
      visible: true,
      children: ["personal-grid"],
    },
    "personal-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["name-field", "email-field"],
    },
    "name-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "name",
        label: "Full Name",
        placeholder: "Jane Doe",
        required: true,
        disabled: null,
        value: { $bindState: "/form/name" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "email-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "jane@example.com",
        required: true,
        disabled: null,
        value: { $bindState: "/form/email" },
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "role-card": {
      type: "Card",
      props: {
        title: "Role & Plan",
        description: "Determines access level and billing tier.",
      },
      visible: true,
      children: ["role-grid"],
    },
    "role-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["role-field", "plan-field"],
    },
    "role-field": {
      type: "SelectField",
      visible: true,
      props: {
        name: "role",
        label: "Role",
        options: [
          { label: "Admin", value: "admin" },
          { label: "Member", value: "member" },
          { label: "Viewer", value: "viewer" },
        ],
        placeholder: "Select role...",
        required: true,
        disabled: null,
        description: "Determines access level in the workspace.",
        value: { $bindState: "/form/role" },
      },
      children: [],
    },
    "plan-field": {
      type: "RadioGroupField",
      visible: true,
      props: {
        name: "plan",
        label: "Plan",
        options: [
          { label: "Free", value: "free" },
          { label: "Pro", value: "pro" },
          { label: "Enterprise", value: "enterprise" },
        ],
        required: true,
        disabled: null,
        description: null,
        value: { $bindState: "/form/plan" },
        orientation: "horizontal",
      },
      children: [],
    },
    "agree-field": {
      type: "CheckboxField",
      visible: true,
      props: {
        name: "agree",
        label: "I agree to the terms and conditions",
        required: true,
        disabled: null,
        description: null,
        checked: { $bindState: "/form/agree" },
      },
      children: [],
    },
  },
};

// ─── Spec 2: Product Registration ────────────────────────────────────────────

const productSpec: FormSpec = {
  root: "product-form",
  state: {
    form: {
      name: "",
      sku: "",
      price: null,
      stock: null,
      category: null,
      status: "draft",
    },
  },
  elements: {
    "product-form": {
      type: "Form",
      props: { title: "Register Product" },
      visible: true,
      children: ["details-card", "pricing-card"],
    },
    "details-card": {
      type: "Card",
      props: { title: "Product Details", description: null },
      visible: true,
      children: ["details-grid"],
    },
    "details-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["product-name-field", "sku-field"],
    },
    "product-name-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "name",
        label: "Product Name",
        placeholder: "Wireless Mouse",
        required: true,
        disabled: null,
        value: { $bindState: "/form/name" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "sku-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "sku",
        label: "SKU",
        placeholder: "WM-001",
        required: true,
        disabled: null,
        value: { $bindState: "/form/sku" },
        type: null,
        description: "Unique product identifier",
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "pricing-card": {
      type: "Card",
      props: { title: "Pricing & Inventory", description: null },
      visible: true,
      children: ["pricing-grid", "category-field", "status-field"],
    },
    "pricing-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["price-field", "stock-field"],
    },
    "price-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "price",
        label: "Unit Price (USD)",
        placeholder: "0.00",
        required: true,
        disabled: null,
        value: { $bindState: "/form/price" },
        type: "number",
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "stock-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "stock",
        label: "Stock",
        placeholder: "100",
        required: null,
        disabled: null,
        value: { $bindState: "/form/stock" },
        type: "number",
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "category-field": {
      type: "SelectField",
      visible: true,
      props: {
        name: "category",
        label: "Category",
        options: [
          { label: "Electronics", value: "electronics" },
          { label: "Accessories", value: "accessories" },
          { label: "Software", value: "software" },
          { label: "Services", value: "services" },
        ],
        placeholder: "Select category...",
        required: true,
        disabled: null,
        description: null,
        value: { $bindState: "/form/category" },
      },
      children: [],
    },
    "status-field": {
      type: "RadioGroupField",
      visible: true,
      props: {
        name: "status",
        label: "Status",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
        ],
        required: null,
        disabled: null,
        description: null,
        value: { $bindState: "/form/status" },
      },
      children: [],
    },
  },
};

// ─── Spec 3: Payment Method (Visibility Demo) ────────────────────────────────
// Selecting a payment method shows only the relevant fields via `visible`
// conditions. This demonstrates state-based conditional rendering.

const paymentSpec: FormSpec = {
  root: "payment-form",
  state: {
    form: {
      method: null,
      // card
      cardNumber: "",
      cardExpiry: "",
      cardCvc: "",
      // bank transfer
      bankName: "",
      accountNumber: "",
      // invoice
      companyName: "",
      billingEmail: "",
    },
  },
  elements: {
    "payment-form": {
      type: "Form",
      props: { title: "Payment" },
      visible: true,
      children: ["method-card", "card-fields-card", "bank-fields-card", "invoice-fields-card"],
    },

    // ── Method selector ──────────────────────────────────────────────────────
    "method-card": {
      type: "Card",
      props: { title: "Payment Method", description: null },
      visible: true,
      children: ["method-field"],
    },
    "method-field": {
      type: "SelectField",
      visible: true,
      props: {
        name: "method",
        label: "How would you like to pay?",
        options: [
          { label: "Credit / Debit Card", value: "card" },
          { label: "Bank Transfer", value: "bank" },
          { label: "Invoice (Net 30)", value: "invoice" },
        ],
        placeholder: "Select payment method...",
        required: true,
        disabled: null,
        description: null,
        value: { $bindState: "/form/method" },
      },
      children: [],
    },

    // ── Card fields (visible only when method === "card") ────────────────────
    "card-fields-card": {
      type: "Card",
      props: {
        title: "Card Details",
        description: "Enter your card information securely.",
      },
      visible: { $state: "/form/method", eq: "card" },
      children: ["card-top-grid", "card-cvc-field"],
    },
    "card-top-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["card-number-field", "card-expiry-field"],
    },
    "card-number-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "cardNumber",
        label: "Card Number",
        placeholder: "4242 4242 4242 4242",
        required: true,
        disabled: null,
        value: { $bindState: "/form/cardNumber" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: 16,
        maxLength: 19,
        pattern: null,
      },
      children: [],
    },
    "card-expiry-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "cardExpiry",
        label: "Expiry (MM/YY)",
        placeholder: "12/28",
        required: true,
        disabled: null,
        value: { $bindState: "/form/cardExpiry" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "card-cvc-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "cardCvc",
        label: "CVC",
        placeholder: "123",
        required: true,
        disabled: null,
        value: { $bindState: "/form/cardCvc" },
        type: null,
        description: "3 or 4 digit security code on the back of your card.",
        min: null,
        max: null,
        minLength: 3,
        maxLength: 4,
        pattern: null,
      },
      children: [],
    },

    // ── Bank transfer fields (visible only when method === "bank") ────────────
    "bank-fields-card": {
      type: "Card",
      props: {
        title: "Bank Transfer Details",
        description: "We will send wire instructions to your email.",
      },
      visible: { $state: "/form/method", eq: "bank" },
      children: ["bank-grid"],
    },
    "bank-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["bank-name-field", "account-number-field"],
    },
    "bank-name-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "bankName",
        label: "Bank Name",
        placeholder: "Chase",
        required: true,
        disabled: null,
        value: { $bindState: "/form/bankName" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "account-number-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "accountNumber",
        label: "Account Number",
        placeholder: "000123456789",
        required: true,
        disabled: null,
        value: { $bindState: "/form/accountNumber" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },

    // ── Invoice fields (visible only when method === "invoice") ───────────────
    "invoice-fields-card": {
      type: "Card",
      props: {
        title: "Invoice Details",
        description: "An invoice will be emailed within 1 business day.",
      },
      visible: { $state: "/form/method", eq: "invoice" },
      children: ["invoice-grid"],
    },
    "invoice-grid": {
      type: "Grid",
      props: { cols: 2, gap: "md" },
      visible: true,
      children: ["company-name-field", "billing-email-field"],
    },
    "company-name-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "companyName",
        label: "Company Name",
        placeholder: "Acme Inc.",
        required: true,
        disabled: null,
        value: { $bindState: "/form/companyName" },
        type: null,
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "billing-email-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "billingEmail",
        label: "Billing Email",
        placeholder: "billing@acme.com",
        required: true,
        disabled: null,
        value: { $bindState: "/form/billingEmail" },
        type: "email",
        description: null,
        min: null,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
  },
};

// ─── Spec 4: Order Summary (sum / multiply / formatCurrency demo) ─────────────
// Three line items, each subtotaled with `multiply`, then grand-totaled with
// `sum`, and formatted with `formatCurrency` — all via built-in functions.

const orderSummarySpec: FormSpec = {
  root: "order-form",
  state: {
    form: {
      qty1: 2,
      price1: 1500,
      qty2: 1,
      price2: 3200,
      qty3: 5,
      price3: 800,
    },
  },
  elements: {
    "order-form": {
      type: "Form",
      props: { title: "Order Summary" },
      visible: true,
      children: ["item1-card", "item2-card", "item3-card", "total-card"],
    },

    // ── Item 1 ────────────────────────────────────────────────────────────────
    "item1-card": {
      type: "Card",
      props: { title: "Item 1", description: null },
      visible: true,
      children: ["item1-grid"],
    },
    "item1-grid": {
      type: "Grid",
      props: { cols: 3, gap: "md" },
      visible: true,
      children: ["qty1-field", "price1-field", "item1-subtotal"],
    },
    "qty1-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "qty1",
        label: "Qty",
        type: "number",
        placeholder: "1",
        required: null,
        disabled: null,
        value: { $bindState: "/form/qty1" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "price1-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "price1",
        label: "Unit Price (USD)",
        type: "number",
        placeholder: "0",
        required: null,
        disabled: null,
        value: { $bindState: "/form/price1" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "item1-subtotal": {
      type: "ReadonlyField",
      visible: true,
      props: {
        label: "Subtotal",
        value: {
          $computed: "formatCurrency",
          args: {
            value: {
              $computed: "multiply",
              args: {
                a: { $state: "/form/qty1" },
                b: { $state: "/form/price1" },
              },
            },
          },
        },
      },
      children: [],
    },

    // ── Item 2 ────────────────────────────────────────────────────────────────
    "item2-card": {
      type: "Card",
      props: { title: "Item 2", description: null },
      visible: true,
      children: ["item2-grid"],
    },
    "item2-grid": {
      type: "Grid",
      props: { cols: 3, gap: "md" },
      visible: true,
      children: ["qty2-field", "price2-field", "item2-subtotal"],
    },
    "qty2-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "qty2",
        label: "Qty",
        type: "number",
        placeholder: "1",
        required: null,
        disabled: null,
        value: { $bindState: "/form/qty2" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "price2-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "price2",
        label: "Unit Price (USD)",
        type: "number",
        placeholder: "0",
        required: null,
        disabled: null,
        value: { $bindState: "/form/price2" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "item2-subtotal": {
      type: "ReadonlyField",
      visible: true,
      props: {
        label: "Subtotal",
        value: {
          $computed: "formatCurrency",
          args: {
            value: {
              $computed: "multiply",
              args: {
                a: { $state: "/form/qty2" },
                b: { $state: "/form/price2" },
              },
            },
          },
        },
      },
      children: [],
    },

    // ── Item 3 ────────────────────────────────────────────────────────────────
    "item3-card": {
      type: "Card",
      props: { title: "Item 3", description: null },
      visible: true,
      children: ["item3-grid"],
    },
    "item3-grid": {
      type: "Grid",
      props: { cols: 3, gap: "md" },
      visible: true,
      children: ["qty3-field", "price3-field", "item3-subtotal"],
    },
    "qty3-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "qty3",
        label: "Qty",
        type: "number",
        placeholder: "1",
        required: null,
        disabled: null,
        value: { $bindState: "/form/qty3" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "price3-field": {
      type: "TextField",
      visible: true,
      props: {
        name: "price3",
        label: "Unit Price (USD)",
        type: "number",
        placeholder: "0",
        required: null,
        disabled: null,
        value: { $bindState: "/form/price3" },
        description: null,
        min: 0,
        max: null,
        minLength: null,
        maxLength: null,
        pattern: null,
      },
      children: [],
    },
    "item3-subtotal": {
      type: "ReadonlyField",
      visible: true,
      props: {
        label: "Subtotal",
        value: {
          $computed: "formatCurrency",
          args: {
            value: {
              $computed: "multiply",
              args: {
                a: { $state: "/form/qty3" },
                b: { $state: "/form/price3" },
              },
            },
          },
        },
      },
      children: [],
    },

    // ── Grand total (sum of all subtotals) ────────────────────────────────────
    "total-card": {
      type: "Card",
      props: {
        title: "Grand Total",
        description: null,
      },
      visible: true,
      children: ["grand-total-text"],
    },
    "grand-total-text": {
      type: "ReadonlyField",
      visible: true,
      props: {
        label: "Total",
        value: {
          $computed: "formatCurrency",
          args: {
            value: {
              $computed: "sum",
              args: {
                values: [
                  {
                    $computed: "multiply",
                    args: {
                      a: { $state: "/form/qty1" },
                      b: { $state: "/form/price1" },
                    },
                  },
                  {
                    $computed: "multiply",
                    args: {
                      a: { $state: "/form/qty2" },
                      b: { $state: "/form/price2" },
                    },
                  },
                  {
                    $computed: "multiply",
                    args: {
                      a: { $state: "/form/qty3" },
                      b: { $state: "/form/price3" },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      children: [],
    },
  },
};

// ─── Spec 5: Purchase Order (TableField) ─────────────────────────────────────

const purchaseOrderSpec: FormSpec = {
  root: "po-form",
  state: {
    lineItems: [
      { itemName: "ノートPC", qty: 2, unitPrice: 150000 },
      { itemName: "マウス", qty: 5, unitPrice: 3000 },
    ],
  },
  elements: {
    "po-form": {
      type: "Form",
      props: { title: "発注明細" },
      visible: true,
      children: ["line-items-card"],
    },
    "line-items-card": {
      type: "Card",
      props: {
        title: "明細",
        description: "行を追加・削除しながら数量と単価を入力してください。金額は自動計算されます。",
      },
      visible: true,
      children: ["line-items-table"],
    },
    "line-items-table": {
      type: "TableField",
      visible: true,
      props: {
        name: "lineItems",
        value: { $bindState: "/lineItems" },
        columns: [
          {
            key: "itemName",
            label: "品名",
            type: "text",
            options: null,
            computeFn: null,
            computeArgs: null,
            width: "14rem",
          },
          {
            key: "qty",
            label: "数量",
            type: "number",
            options: null,
            computeFn: null,
            computeArgs: null,
            width: "6rem",
          },
          {
            key: "unitPrice",
            label: "単価 (円)",
            type: "number",
            options: null,
            computeFn: null,
            computeArgs: null,
            width: "8rem",
          },
          {
            key: "amount",
            label: "金額 (円)",
            type: "readonly",
            options: null,
            computeFn: "multiply",
            computeArgs: { a: { $row: "qty" }, b: { $row: "unitPrice" } },
            width: "8rem",
          },
        ],
        footer: {
          qty: { aggregation: "sum", template: "合計 {{value}} 個" },
          amount: { aggregation: "sum", template: "合計 ¥{{value}}" },
        },
        allowAddRow: true,
        allowDeleteRow: true,
        defaultRowValues: { itemName: "", qty: 1, unitPrice: 0 },
      },
      children: [],
    },
  },
};

// ─── Spec registry ────────────────────────────────────────────────────────────

const SPECS: { id: string; label: string; spec: FormSpec }[] = [
  { id: "new-user", label: "New User", spec: newUserSpec },
  { id: "product", label: "Product Registration", spec: productSpec },
  {
    id: "payment",
    label: "Payment (Visibility Demo)",
    spec: paymentSpec,
  },
  {
    id: "order-summary",
    label: "Order Summary (sum / multiply)",
    spec: orderSummarySpec,
  },
  {
    id: "purchase-order",
    label: "Purchase Order (TableField)",
    spec: purchaseOrderSpec,
  },
];

// ─── SpecDemo subcomponent ────────────────────────────────────────────────────
// Keyed by specId so the store is recreated when the spec changes.

function SpecDemo({
  spec,
  onSubmit,
}: {
  spec: FormSpec;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const store = React.useMemo(() => createStateStore(spec.state ?? {}), [spec]);

  function handleSubmit() {
    const state = store.getSnapshot();
    onSubmit((state.form ?? state) as Record<string, unknown>);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      {/* Left: spec JSON */}
      <Card.Root>
        <Card.Header title="Spec (JSON)" description="The raw FormSpec passed to <RenderJSON>." />
        <Card.Content>
          <pre
            style={{
              fontSize: "0.75rem",
              background: "var(--muted)",
              padding: "1rem",
              borderRadius: "0.5rem",
              overflow: "auto",
              maxHeight: "600px",
            }}
          >
            {JSON.stringify(spec, null, 2)}
          </pre>
        </Card.Content>
      </Card.Root>

      {/* Right: JSON-driven form */}
      <Card.Root>
        <Card.Header
          title="Rendered UI"
          description="Fields are bound to state via $bindState. Card and Grid are used inside the spec for layout."
        />
        <Card.Content>
          <RenderJSON spec={spec} store={store} />
          <div style={{ marginTop: "1rem" }}>
            <Button onClick={handleSubmit}>Submit</Button>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const RenderJSONDemoPage = () => {
  const [currentId, setCurrentId] = React.useState(SPECS[0].id);
  const [submitted, setSubmitted] = React.useState<Record<string, unknown> | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const current = SPECS.find((s) => s.id === currentId)!;

  function handleSubmit(values: Record<string, unknown>) {
    setSubmitted(values);
    setDialogOpen(true);
  }

  return (
    <Layout>
      <Layout.Header title="RenderJSON Demo" />
      <Layout.Column>
        {/* Spec selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label htmlFor="spec-select" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Spec:
          </label>
          <select
            id="spec-select"
            value={currentId}
            onChange={(e) => setCurrentId(e.target.value)}
            style={{
              fontSize: "0.875rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            {SPECS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <SpecDemo key={currentId} spec={current.spec} onSubmit={handleSubmit} />

        {/* Submitted values dialog */}
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Submitted values</Dialog.Title>
              <Dialog.Description>
                state.form snapshot read from the external store on submit.
              </Dialog.Description>
            </Dialog.Header>
            <pre
              style={{
                fontSize: "0.8rem",
                background: "var(--muted)",
                padding: "1rem",
                borderRadius: "0.5rem",
                overflow: "auto",
              }}
            >
              {JSON.stringify(submitted, null, 2)}
            </pre>
          </Dialog.Content>
        </Dialog.Root>
      </Layout.Column>
    </Layout>
  );
};

export const renderJSONDemoResource = defineResource({
  path: "render-json-demo",
  meta: {
    title: "RenderJSON Demo",
  },
  component: RenderJSONDemoPage,
});
