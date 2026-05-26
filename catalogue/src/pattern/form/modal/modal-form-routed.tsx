/* pattern: form/modal (route-driven variant) */
import { Button, Dialog, Input, Layout, Field } from "@tailor-platform/app-shell";

type Props = {
  isCreateOpen: boolean;
  onNavigateToCreate: () => void;
  onNavigateToList: () => void;
  onSave: (data: { name: string }) => void;
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onSave({ name: formData.get("name") as string });
            }}
          >
            <div className="space-y-4 py-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
            </div>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onNavigateToList}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Layout>
  );
}
