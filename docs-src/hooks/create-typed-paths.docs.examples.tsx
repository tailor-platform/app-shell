import { useState } from "react";
import { createTypedPaths, Field, Text } from "@tailor-platform/app-shell";

export function PathBuilder() {
  const [productId, setProductId] = useState("123");
  type Routes = {
    "/products": {};
    "/products/:id": { id: string };
  };
  const paths = createTypedPaths<Routes>();

  return (
    <div className="flex flex-col gap-3">
      <Field.Root name="productId">
        <Field.Label>Product ID</Field.Label>
        <Field.Control value={productId} onChange={(event) => setProductId(event.target.value)} />
        <Field.Description>
          Try A/B or a value with spaces. No navigation is performed.
        </Field.Description>
      </Field.Root>
      <div aria-live="polite" className="space-y-2 break-all">
        <Text.p>
          Static route: <code>{paths.for("/products")}</code>
        </Text.p>
        <Text.p>
          Dynamic route: <code>{paths.for("/products/:id", { id: productId })}</code>
        </Text.p>
        <Text.p>
          With query: <code>{paths.for("/products/:id?tab=details", { id: productId })}</code>
        </Text.p>
      </div>
    </div>
  );
}
