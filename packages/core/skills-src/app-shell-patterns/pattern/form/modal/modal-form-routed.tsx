/* pattern: form/modal (route-driven variant) */
import { useState } from "react";
import { Button, Dialog, Field, Form, Layout } from "@tailor-platform/app-shell";

type ProductDraft = {
  name: string;
};

type Props = {
  isCreateOpen: boolean;
  onNavigateToCreate: () => void;
  onNavigateToList: () => void;
  onSave: (data: ProductDraft) => Promise<{ errors?: Record<string, string> }>;
};

/**
 * Route-driven modal: the form has its own URL but renders as a popup
 * over the list. Both `/products` and `/products/create` render this
 * same component — the parent list stays visible underneath.
 */
export default function ModalFormRouted({
  isCreateOpen,
  onNavigateToCreate,
  onNavigateToList,
  onSave,
}: Props) {
  // Server-side validation errors, keyed by field `name`. `Form` routes each
  // one to the matching `Field.Error` and clears it when the user edits that
  // field — so failures never need their own alert banner.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (values: ProductDraft) => {
    const result = await onSave(values);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onNavigateToList();
  };

  return (
    <Layout>
      <Layout.Header
        title="Products"
        actions={[
          <Button key="create" onClick={onNavigateToCreate}>
            Create
          </Button>,
        ]}
      />
      <Layout.Column>{/* products list — see list/dense-scan */}</Layout.Column>

      <Dialog.Root
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) onNavigateToList();
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create product</Dialog.Title>
          </Dialog.Header>
          <Form<ProductDraft> noValidate errors={errors} onFormSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control required />
                {/* Catch-all: renders the native message, a `match` message, or
                    the server error routed in via the `errors` prop above. */}
                <Field.Error />
              </Field.Root>
            </div>
            <Dialog.Footer>
              <Button type="button" variant="ghost" onClick={onNavigateToList}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Dialog.Footer>
          </Form>
        </Dialog.Content>
      </Dialog.Root>
    </Layout>
  );
}
