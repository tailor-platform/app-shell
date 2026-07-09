import { Button, Link } from "@tailor-platform/app-shell";

export function ButtonLinkAndDestructiveExample() {
  const handleDelete = () => {};

  return (
    <>
      <Button render={<Link to="create" />}>Create</Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </>
  );
}
