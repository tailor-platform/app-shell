import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Badge, badgeVariants, type BadgeVariant } from "@tailor-platform/app-shell";

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
      <Badge variant="subtle-neutral">Subtle Neutral</Badge>
    </div>
  );
}

export function SolidAndSubtleVariants() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Approved</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="error">Rejected</Badge>
      <Badge variant="neutral">Draft</Badge>
      <Badge variant="info">New</Badge>
      <Badge variant="subtle-success">Matched</Badge>
      <Badge variant="subtle-warning">Needs Attention</Badge>
      <Badge variant="subtle-error">Needs Review</Badge>
      <Badge variant="subtle-info">In Progress</Badge>
      <Badge variant="subtle-neutral">Archived</Badge>
    </div>
  );
}

export function OutlineVariants() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline-success">Active</Badge>
      <Badge variant="outline-warning">In Progress</Badge>
      <Badge variant="outline-error">Failed</Badge>
      <Badge variant="outline-info">Info</Badge>
      <Badge variant="outline-neutral">Inactive</Badge>
    </div>
  );
}

export function OrderStatuses() {
  const variantMap: Record<string, BadgeVariant> = {
    pending: "outline-warning",
    processing: "outline-info",
    shipped: "outline-success",
    delivered: "success",
    cancelled: "outline-error",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {["pending", "processing", "shipped", "delivered", "cancelled", "draft"].map((status) => (
        <Badge key={status} variant={variantMap[status] || "neutral"}>
          {status.toUpperCase()}
        </Badge>
      ))}
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">
        <CheckCircle aria-hidden className="mr-1 size-3" />
        Verified
      </Badge>
      <Badge variant="warning">
        <AlertCircle aria-hidden className="mr-1 size-3" />
        Review
      </Badge>
      <Badge variant="error">
        <XCircle aria-hidden className="mr-1 size-3" />
        Blocked
      </Badge>
    </div>
  );
}

export function DynamicVariants() {
  function ProductBadge({ product }: { product: { name: string; stock: number } }) {
    let variant: BadgeVariant = "success";
    if (product.stock === 0) {
      variant = "error";
    } else if (product.stock < 10) {
      variant = "warning";
    }

    return <Badge variant={variant}>{product.stock} in stock</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ProductBadge product={{ name: "Steel bracket", stock: 24 }} />
      <ProductBadge product={{ name: "Hex bolt", stock: 5 }} />
      <ProductBadge product={{ name: "Washer", stock: 0 }} />
    </div>
  );
}

export function CustomStyling() {
  return (
    <Badge variant="success" className="uppercase">
      Premium
    </Badge>
  );
}

export function StylingUtility() {
  return <div className={`${badgeVariants({ variant: "success" })} mt-2`}>Custom Badge</div>;
}
