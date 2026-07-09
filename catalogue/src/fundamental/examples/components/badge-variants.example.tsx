import { Badge } from "@tailor-platform/app-shell";

export function BadgeVariantsExample() {
  return (
    <>
      <Badge variant="success">Confirmed</Badge>
      <Badge variant="outline-warning">Partially received</Badge>
      <Badge variant="subtle-info">New</Badge>
    </>
  );
}
