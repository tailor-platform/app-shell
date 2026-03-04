import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

export const BoldIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
  </svg>
);

export const ItalicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </svg>
);

export const UnderlineIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" x2="20" y1="20" y2="20" />
  </svg>
);

export const InfoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const AlignLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

export const AlignCenterIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="17" x2="7" y1="12" y2="12" />
    <line x1="19" x2="5" y1="18" y2="18" />
  </svg>
);

export const AlignRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="9" y1="12" y2="12" />
    <line x1="21" x2="7" y1="18" y2="18" />
  </svg>
);

export const ChevronsUpDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

// ============================================================================
// Section wrapper
// ============================================================================

import { Separator } from "@tailor-platform/app-shell";

export const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div
    className="astw:rounded-lg astw:border astw:border-border astw:bg-card astw:p-6"
    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
  >
    <h3 className="astw:text-base astw:font-semibold astw:text-foreground">
      {title}
    </h3>
    <Separator />
    {children}
  </div>
);

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="astw:text-sm astw:font-medium">{children}</span>
);

// ============================================================================
// Mock data
// ============================================================================

export const mockOrder = {
  id: "po-2024-0042",
  docNumber: "PO-10000041",
  status: "CONFIRMED",
  billingStatus: "PARTIALLY_BILLED",
  deliveryStatus: "NOT_RECEIVED",
  supplierName: "Acme Industrial Supplies",
  expectedDeliveryDate: "2024-02-15T00:00:00Z",
  createdAt: "2024-01-20T10:30:00Z",
  confirmedAt: "2024-01-21T09:00:00Z",
  externalReference: "P00594",
  note: "Rush order - priority shipping requested.",
  currency: { code: "USD", symbol: "$" },
  shipToLocation: {
    name: "Main Warehouse",
    address: {
      line1: "1234 Industrial Blvd",
      line2: "Building C",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "United States",
    },
  },
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
};

export const invoices = Array.from({ length: 30 }, (_, i) => ({
  id: `INV-${String(i + 1).padStart(3, "0")}`,
  status: ["Paid", "Pending", "Unpaid"][i % 3],
  method: ["Credit Card", "PayPal", "Bank Transfer"][i % 3],
  amount: `$${((i + 1) * 75 + 100).toFixed(2)}`,
}));

export const fruits = ["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"];
export const frameworks = [
  "React",
  "Vue",
  "Angular",
  "Svelte",
  "Express",
  "NestJS",
];

export interface ProduceGroupItem {
  value: string;
  items: string[];
}

export const produceGroups: ProduceGroupItem[] = [
  { value: "Fruits", items: ["Apple", "Banana", "Orange"] },
  { value: "Vegetables", items: ["Carrot", "Lettuce", "Spinach"] },
];

export const frameworkGroups: ProduceGroupItem[] = [
  { value: "Frontend", items: ["React", "Vue", "Angular", "Svelte"] },
  { value: "Backend", items: ["Express", "NestJS", "Fastify"] },
];

export const programmingLanguages = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Java",
  "C#",
  "Swift",
  "Kotlin",
  "Ruby",
];

export interface LabelItem {
  id: string;
  value: string;
}

export const initialLabels: LabelItem[] = [
  { id: "bug", value: "bug" },
  { id: "docs", value: "documentation" },
  { id: "enhancement", value: "enhancement" },
  { id: "help-wanted", value: "help wanted" },
  { id: "good-first-issue", value: "good first issue" },
];

export interface ShippingMethod {
  id: string;
  label: string;
  description: string;
  price: string;
}

export const shippingMethods: ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Delivers in 4-6 business days",
    price: "$4.99",
  },
  {
    id: "express",
    label: "Express",
    description: "Delivers in 2-3 business days",
    price: "$9.99",
  },
  {
    id: "overnight",
    label: "Overnight",
    description: "Delivers next business day",
    price: "$19.99",
  },
];
