import * as React from "react";
import { Badge, EditableCard, Field, Select } from "@tailor-platform/app-shell";

const WAREHOUSES = ["Tokyo DC", "Osaka DC", "Nagoya DC"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 60"];

type OrderValues = {
  shipTo: string;
  paymentTerms: string;
};

export function BasicUsage() {
  return (
    <EditableCard<OrderValues>
      title="Order details"
      columns={3}
      onSave={async (values) => {
        await saveOrder(values);
      }}
    >
      <EditableCard.Field
        label="Status"
        value={<Badge variant="outline-info">Confirmed</Badge>}
        readOnly={{ kind: "system", reason: "Changes as the order moves through approval." }}
      />
      <EditableCard.Field
        label="Supplier"
        value="Kansai Textile Co."
        readOnly={{ kind: "locked", reason: "Can't change after the order is confirmed." }}
      />
      <EditableCard.Field name="shipTo" label="Ship to" value="Osaka DC">
        <Select items={WAREHOUSES} defaultValue="Osaka DC" />
      </EditableCard.Field>
      <EditableCard.Field name="paymentTerms" label="Payment terms" value="Net 30">
        <Select items={PAYMENT_TERMS} defaultValue="Net 30" />
      </EditableCard.Field>
      <EditableCard.Field
        label="Order total"
        value="US$12,526.20"
        readOnly={{ kind: "calculated", reason: "Sum of the order lines." }}
      />
    </EditableCard>
  );
}

type ContactValues = {
  email: string;
};

export function ServerErrors() {
  const [contact, setContact] = React.useState({ email: "orders@kansai-textile.example" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  return (
    <EditableCard<ContactValues>
      title="Supplier contact"
      columns={2}
      errors={errors}
      onCancel={() => setErrors({})}
      onSave={async (values) => {
        const result = await saveContact(values);
        if (result.errors) {
          setErrors(result.errors);
          // Rejecting keeps the card in edit mode with the user's changes
          throw new Error("Contact not saved");
        }
        setErrors({});
        setContact(values);
      }}
    >
      <EditableCard.Field name="email" label="Order email" value={contact.email} required>
        <Field.Control type="email" defaultValue={contact.email} required />
      </EditableCard.Field>
      <EditableCard.Field label="Phone" value={null} />
    </EditableCard>
  );
}

async function saveOrder(values: OrderValues) {
  console.log(values);
}

async function saveContact(values: ContactValues): Promise<{ errors?: Record<string, string> }> {
  return values.email.endsWith("@example.com")
    ? { errors: { email: "Use an address at the supplier's own domain." } }
    : {};
}
