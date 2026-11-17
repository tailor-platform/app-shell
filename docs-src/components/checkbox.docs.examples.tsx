import { useState } from "react";
import { Checkbox, Field, Text } from "@tailor-platform/app-shell";

export function Controlled() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-3">
      <Checkbox label="Enable notifications" checked={checked} onCheckedChange={setChecked} />
      <Text.p role="status">Notifications: {checked ? "enabled" : "disabled"}</Text.p>
    </div>
  );
}

export function SelectAll() {
  const orders = ["Order 1001", "Order 1002", "Order 1003"];
  const [selected, setSelected] = useState<string[]>(["Order 1001"]);
  const allSelected = selected.length === orders.length;
  const someSelected = selected.length > 0;

  return (
    <div className="space-y-3">
      <Checkbox
        label="Select all orders"
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onCheckedChange={(checked) => setSelected(checked ? orders : [])}
      />
      <div className="flex flex-col gap-2 pl-6" role="group" aria-label="Orders">
        {orders.map((order) => (
          <Checkbox
            key={order}
            label={order}
            checked={selected.includes(order)}
            onCheckedChange={(checked) =>
              setSelected((current) =>
                checked ? [...current, order] : current.filter((value) => value !== order),
              )
            }
          />
        ))}
      </div>
      <Text.p role="status">Selected orders: {selected.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function BasicUsage() {
  return <Checkbox label="Subscribe to updates" />;
}

export function BoxOnly() {
  return <Checkbox aria-label="Select row" />;
}

export function Disabled() {
  return <Checkbox label="Unavailable option" disabled />;
}

export function WithField() {
  return (
    <Field.Root name="acceptTerms" error={{ message: "You must accept the terms." }}>
      <Checkbox label="I accept the terms and conditions" />
      <Field.Error>You must accept the terms.</Field.Error>
    </Field.Root>
  );
}
