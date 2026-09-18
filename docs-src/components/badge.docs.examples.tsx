import { Badge } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="subtle-success">Subtle Success</Badge>
      <Badge variant="subtle-warning">Subtle Warning</Badge>
      <Badge variant="subtle-error">Subtle Error</Badge>
      <Badge variant="subtle-info">Subtle Info</Badge>
    </div>
  );
}
